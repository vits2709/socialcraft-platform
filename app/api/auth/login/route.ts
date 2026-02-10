import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export const runtime = "nodejs";

function verifyScryptPassword(password: string, stored: string) {
  // formato atteso: scrypt$<saltHex>$<derivedHex>
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [algo, saltHex, derivedHex] = parts;
  if (algo !== "scrypt") return false;

  const salt = Buffer.from(saltHex, "hex");
  const derivedStored = Buffer.from(derivedHex, "hex");

  const derived = crypto.scryptSync(password, salt, derivedStored.length, {
    N: 16384,
    r: 8,
    p: 1,
  });

  // timing-safe compare
  return (
    derived.length === derivedStored.length &&
    crypto.timingSafeEqual(derived, derivedStored)
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();

    if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    if (!password) return NextResponse.json({ ok: false, error: "missing_password" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    // 1) prendi utente da sc_users
    const { data: u, error: e1 } = await supabase
      .from("sc_users")
      .select("id, email, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (e1) return NextResponse.json({ ok: false, error: `db_error:${e1.message}` }, { status: 500 });

    // se non esiste proprio -> profilo mancante
    if (!u?.id) {
      return NextResponse.json({ ok: false, error: "profile_missing" }, { status: 404 });
    }

    // se esiste ma non ha password impostata -> profilo incompleto
    if (!u.password_hash) {
      return NextResponse.json({ ok: false, error: "password_not_set" }, { status: 400 });
    }

    // 2) verifica password
    const ok = verifyScryptPassword(password, u.password_hash);
    if (!ok) return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });

    // 3) set cookie explorer
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