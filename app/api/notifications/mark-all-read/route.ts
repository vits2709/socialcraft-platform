import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const scUid = req.cookies.get("sc_uid")?.value?.trim();
  if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("user_notifications")
    .update({ read: true })
    .eq("user_id", scUid)
    .eq("read", false);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
