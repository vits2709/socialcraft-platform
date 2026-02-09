import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "").trim();

    if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    if (!password) return NextResponse.json({ ok: false, error: "missing_password" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    const { data: userId, error } = await supabase.rpc("sc_login", {
      p_email: email,
      p_password: password,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set("sc_uid", String(userId), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ ok: true, user_id: userId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}