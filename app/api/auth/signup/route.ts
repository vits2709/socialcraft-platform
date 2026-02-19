import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export const runtime = "nodejs";

function hashScryptPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = String(body.display_name ?? "").trim();
    const role = String(body.role ?? "explorer").trim(); // explorer|spot (admin NO)

    if (!email || !password) return NextResponse.json({ ok: false, error: "missing_email_or_password" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
    if (!["explorer", "spot"].includes(role)) return NextResponse.json({ ok: false, error: "invalid_role" }, { status: 400 });

    const supabase = await createSupabaseServerClient();

    // 1) Crea account Supabase Auth (necessario per spot dashboard via getSessionUser)
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: error?.message ?? "signup_failed" }, { status: 400 });
    }

    const adminSupabase = createSupabaseAdminClient();
    const userId = data.user.id;

    // 2) Crea riga sc_users con email + password_hash (necessario per login explorer e punti)
    //    Gli spot usano Supabase Auth per login, ma hanno comunque una riga sc_users
    //    in modo da poter usare il sistema punti in futuro.
    const passwordHash = hashScryptPassword(password);

    const { error: scErr } = await adminSupabase
      .from("sc_users")
      .upsert(
        {
          id: userId,
          name: displayName || null,
          email,
          password_hash: passwordHash,
          password_set_at: new Date().toISOString(),
          points: 0,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

    if (scErr) {
      // Rollback: rimuovi l'utente auth per non lasciare account fantasma
      await adminSupabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ ok: false, error: `sc_users_failed:${scErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
