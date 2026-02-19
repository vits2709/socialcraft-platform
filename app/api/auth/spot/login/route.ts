import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // 1) Login Supabase Auth (setta cookie sb-* per getSessionUser)
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }

    // 2) Verifica che l'utente sia owner di almeno uno spot
    const adminSupabase = createSupabaseAdminClient();
    const { data: venue } = await adminSupabase
      .from("venues")
      .select("id")
      .eq("owner_user_id", data.user.id)
      .maybeSingle();

    if (!venue) {
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, error: "not_spot_owner" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
