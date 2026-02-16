import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const scUid = cookieStore.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const name = String(body?.name ?? "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
    if (name.length > 24) return NextResponse.json({ ok: false, error: "name_too_long" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from("sc_users").update({ name, updated_at: new Date().toISOString() }).eq("id", scUid);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, name });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}