import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export const runtime = "nodejs";

function norm(s: unknown) {
  return String(s ?? "").trim();
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function makeLoginCode(first: string, last: string) {
  const f = first.toLowerCase().replace(/[^a-z0-9]/g, "");
  const l = last.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = (f.slice(0, 2) + l.slice(0, 6)).replace(/^$/, "user");
  const suffix = String(Math.floor(Math.random() * 90) + 10); // 2 cifre
  return `${base}${suffix}`; // es: teuser42
}

function makeDisplayName(first: string, last: string) {
  const f = first.trim();
  const li = last.trim().slice(0, 1).toUpperCase();
  if (!f) return "Esploratore";
  return li ? `${f} ${li}.` : f;
}

function hashPassword(password: string) {
  // scrypt: salt random + hash
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const first = norm(body.first_name);
    const last = norm(body.last_name);
    const email = norm(body.email).toLowerCase();
    const password = norm(body.password);
    const nickname = norm(body.nickname); // opzionale

    if (!email || !isEmail(email)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // blocca doppioni email (così il bottone dà errore chiaro e non “non fa nulla”)
    const { data: existing, error: exErr } = await supabase
      .from("sc_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ ok: false, error: `check_failed:${exErr.message}` }, { status: 500 });
    }
    if (existing?.id) {
      return NextResponse.json({ ok: false, error: "email_already_exists" }, { status: 409 });
    }

    const login_code = makeLoginCode(first, last);
    const displayName = nickname ? nickname : makeDisplayName(first, last);
    const password_hash = hashPassword(password);

    // ✅ IMPORTANTE: usa SOLO colonne esistenti in sc_users
    // (email, password_hash, login_code, name, nickname_locked)
    const { data: created, error: insErr } = await supabase
      .from("sc_users")
      .insert({
        email,
        password_hash,
        login_code,
        name: displayName,
        nickname_locked: Boolean(nickname), // se lo scegli ora, lo blocchiamo subito
      })
      .select("id, login_code, name")
      .single();

    if (insErr) {
      return NextResponse.json({ ok: false, error: `insert_failed:${insErr.message}` }, { status: 500 });
    }

    // opzionale: setta cookie di sessione custom (se già lo fai altrove, NON toccare)
    // Qui ti lascio solo la response.
    return NextResponse.json({
      ok: true,
      user_id: created.id,
      login_code: created.login_code,
      display_name: created.name,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}