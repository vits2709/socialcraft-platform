import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export const runtime = "nodejs";

function hashScryptPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function verifyScryptPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [algo, saltHex, derivedHex] = parts;
  if (algo !== "scrypt") return false;

  const salt = Buffer.from(saltHex, "hex");
  const derivedStored = Buffer.from(derivedHex, "hex");

  const derived = crypto.scryptSync(password, salt, derivedStored.length, { N: 16384, r: 8, p: 1 });
  return derived.length === derivedStored.length && crypto.timingSafeEqual(derived, derivedStored);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();

    if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    if (!password) return NextResponse.json({ ok: false, error: "missing_password" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    // 1) carica user
    const { data: u, error: e1 } = await supabase
      .from("sc_users")
      .select("id, email, password_hash")
      .ilike("email", email)
      .maybeSingle();

    if (e1) return NextResponse.json({ ok: false, error: `db_error:${e1.message}` }, { status: 500 });
    if (!u?.id) return NextResponse.json({ ok: false, error: "profile_missing" }, { status: 404 });

    // 2) Se già in formato nuovo -> verifica Node
    if (u.password_hash?.startsWith("scrypt$")) {
      const ok = verifyScryptPassword(password, u.password_hash);
      if (!ok) return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    } else {
      // 3) Legacy fallback: usa la tua vecchia RPC (se esiste) per utenti storici
      //    (adatta il nome/params se la tua RPC si chiama diversamente)
      const { data: legacy, error: le } = await supabase.rpc("sc_login", {
        p_email: email,
        p_password: password,
      });

      if (le || !legacy) {
        return NextResponse.json(
          { ok: false, error: "invalid_credentials" },
          { status: 401 }
        );
      }

      // 4) MIGRA: salva hash scrypt nuovo
      const newHash = hashScryptPassword(password);
      await supabase
        .from("sc_users")
        .update({ password_hash: newHash, password_set_at: new Date().toISOString() })
        .eq("id", u.id);
    }

    // 5) set cookie explorer
    const cookieStore = await cookies();
    cookieStore.set("sc_uid", String(u.id), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ ok: true, user_id: u.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}