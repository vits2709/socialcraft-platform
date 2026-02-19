import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

    const adminSupabase = createSupabaseAdminClient();

    // il trigger SQL crea profiles di default (explorer), qui settiamo role + display_name
    const { error: upErr } = await adminSupabase
      .from("profiles")
      .update({ role, display_name: displayName || null })
      .eq("id", data.user.id);

    if (upErr) {
      return NextResponse.json({ ok: false, error: `profile_update_failed:${upErr.message}` }, { status: 500 });
    }

    // crea riga sc_users (upsert per sicurezza in caso esista già da trigger)
    const { error: scErr } = await adminSupabase
      .from("sc_users")
      .upsert(
        { id: data.user.id, name: displayName || null, points: 0 },
        { onConflict: "id", ignoreDuplicates: true }
      );

    if (scErr) {
      return NextResponse.json({ ok: false, error: `sc_users_failed:${scErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}