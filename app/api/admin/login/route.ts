import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    if (!password) return NextResponse.json({ ok: false, error: "missing_password" }, { status: 400 });

    // ✅ usa il client "server" (quello che gestisce i cookie di sessione)
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ ok: false, error: `admin_login_failed:${error.message}` }, { status: 401 });
    }

    // Se vuoi: ritorna anche user id/email per debug
    return NextResponse.json({
      ok: true,
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}