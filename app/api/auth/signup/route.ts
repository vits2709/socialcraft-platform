import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: error?.message ?? "signup_failed" }, { status: 400 });
    }

    // il trigger SQL crea profiles di default (explorer), qui settiamo role + display_name
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ role, display_name: displayName || null })
      .eq("id", data.user.id);

    if (upErr) {
      return NextResponse.json({ ok: false, error: `profile_update_failed:${upErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}