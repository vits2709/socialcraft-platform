import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const expectedRole = String(body.expected_role ?? "").trim(); // explorer|spot|admin

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "missing_email_or_password" }, { status: 400 });
    }
    if (!["explorer", "spot", "admin"].includes(expectedRole)) {
      return NextResponse.json({ ok: false, error: "missing_expected_role" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }

    // ruolo da profiles
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (pErr || !prof?.role) {
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, error: "profile_missing" }, { status: 403 });
    }

    if (prof.role !== expectedRole) {
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, error: `not_${expectedRole}` }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}