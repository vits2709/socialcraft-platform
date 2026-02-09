import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export const runtime = "nodejs";

function norm(s: any) {
  return String(s ?? "").trim();
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Password hashing (senza dipendenze)
function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

// login_code: es. viSTRA12 (iniziali + pezzo cognome + numero se serve)
function baseLoginCode(first: string, last: string) {
  const f = first.toLowerCase().replace(/[^a-z]/g, "");
  const l = last.toLowerCase().replace(/[^a-z]/g, "");
  const initials = (f[0] ?? "u") + (l[0] ?? "x");
  const chunk = (l.slice(0, 5) || "user").padEnd(3, "x");
  return (initials + chunk).toUpperCase(); // es: VSSTRA
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const first = norm(body.first_name);
    const last = norm(body.last_name);
    const email = norm(body.email).toLowerCase();
    const password = String(body.password ?? "");

    if (!first) return NextResponse.json({ ok: false, error: "missing_first_name" }, { status: 400 });
    if (!last) return NextResponse.json({ ok: false, error: "missing_last_name" }, { status: 400 });
    if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    if (!isEmail(email)) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    if (!password || password.length < 6)
      return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    // 1) evita duplicati email
    const { data: existing, error: exErr } = await supabase
      .from("sc_users")
      .select("id,email")
      .eq("email", email)
      .maybeSingle();

    if (exErr) return NextResponse.json({ ok: false, error: `check_email_failed:${exErr.message}` }, { status: 500 });
    if (existing) return NextResponse.json({ ok: false, error: "email_already_used" }, { status: 409 });

    // 2) genera login_code unico (prova fino a 20 varianti)
    const base = baseLoginCode(first, last);
    let login_code = base;
    let attempt = 0;

    while (attempt < 20) {
      const { data: lcExists, error: lcErr } = await supabase
        .from("sc_users")
        .select("id,login_code")
        .eq("login_code", login_code)
        .maybeSingle();

      if (lcErr) return NextResponse.json({ ok: false, error: `check_login_code_failed:${lcErr.message}` }, { status: 500 });

      if (!lcExists) break;

      attempt += 1;
      // aggiunge numero: VSSTRA2, VSSTRA3...
      login_code = `${base}${attempt + 1}`;
    }

    if (attempt >= 20) {
      return NextResponse.json({ ok: false, error: "login_code_generation_failed" }, { status: 500 });
    }

    const password_hash = hashPassword(password);

    // 3) crea utente
    // NB: metti i nomi colonne ESATTI della tua sc_users:
    // dalla tua tabella vedo: id, first_name, last_name, email, password_hash, login_code, name?, nickname_locked?, created_at...
    const { data: created, error: insErr } = await supabase
      .from("sc_users")
      .insert({
        first_name: first,
        last_name: last,
        email,
        password_hash,
        login_code,
        // name: null, // se esiste la colonna "name" e vuoi che parta vuota
        // nickname_locked: false, // se esiste
      })
      .select("id,login_code")
      .maybeSingle();

    if (insErr) {
      return NextResponse.json({ ok: false, error: `insert_failed:${insErr.message}` }, { status: 500 });
    }
    if (!created?.id) {
      return NextResponse.json({ ok: false, error: "insert_failed_no_id" }, { status: 500 });
    }

    // 4) set cookie sc_uid (serve a tutta la tua piattaforma)
    const res = NextResponse.json({ ok: true, user_id: created.id, login_code: created.login_code });

    res.cookies.set("sc_uid", String(created.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 anno
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}