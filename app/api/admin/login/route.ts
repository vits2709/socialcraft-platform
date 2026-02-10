import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "missing_credentials" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // 1) Login Supabase Auth
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr || !auth?.user) {
      return NextResponse.json(
        { ok: false, error: "invalid_login_credentials" },
        { status: 401 }
      );
    }

    const uid = auth.user.id;

    // 2) Check admin table
    const { data: adminRow, error: aErr } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();

    if (aErr) {
      // error db
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, error: `admin_check_failed:${aErr.message}` }, { status: 500 });
    }

    if (!adminRow) {
      // non admin -> logout e stop
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, error: "not_admin" }, { status: 403 });
    }

    // ✅ ok: cookie di sessione già gestiti dal server client
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}