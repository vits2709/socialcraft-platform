import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    if (!password) return NextResponse.json({ ok: false, error: "missing_password" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    // 1) trova utente
    const { data: u, error: uErr } = await supabase
      .from("sc_users")
      .select("id,email,password_hash")
      .ilike("email", email)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, error: `user_lookup_failed:${uErr.message}` }, { status: 500 });
    if (!u || !u.password_hash) return NextResponse.json({ ok: false, error: "invalid_login_credentials" }, { status: 401 });

    // 2) verifica password via Postgres crypt
    const { data: okPwd, error: pErr } = await supabase.rpc("check_password_hash", {
      p_hash: u.password_hash,
      p_password: password,
    });

    if (pErr) return NextResponse.json({ ok: false, error: `password_check_failed:${pErr.message}` }, { status: 500 });
    if (!okPwd) return NextResponse.json({ ok: false, error: "invalid_login_credentials" }, { status: 401 });

    // 3) verifica che sia admin
    const { data: a, error: aErr } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", u.id)
      .maybeSingle();

    if (aErr) return NextResponse.json({ ok: false, error: `admin_check_failed:${aErr.message}` }, { status: 500 });
    if (!a) return NextResponse.json({ ok: false, error: "not_admin" }, { status: 403 });

    // 4) set cookie admin
    const res = NextResponse.json({ ok: true });
    res.cookies.set("sc_admin_uid", String(u.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}