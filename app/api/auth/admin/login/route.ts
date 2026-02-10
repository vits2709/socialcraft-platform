import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server"; // <-- NON read-only

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // ✅ login supabase auth (setta i cookie sb-* automaticamente tramite server client)
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
      return NextResponse.json({ ok: false, error: error?.message ?? "login_failed" }, { status: 401 });
    }

    // ✅ opzionale ma consigliato: verifica che sia admin (tabella admins)
    const { data: adminRow, error: aErr } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (aErr) {
      return NextResponse.json({ ok: false, error: `admins_check_failed:${aErr.message}` }, { status: 500 });
    }
    if (!adminRow) {
      // logout immediato se non admin
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, error: "not_admin" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}