import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) {
      return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });
    }

    const { error } = await supabase
      .from("sc_users")
      .update({ onboarding_completed: true })
      .eq("id", scUid);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
