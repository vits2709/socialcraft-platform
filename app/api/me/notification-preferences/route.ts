import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const scUid = req.cookies.get("sc_uid")?.value?.trim();
  if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const preferences = body?.preferences as Record<string, boolean> | undefined;
  if (!preferences || typeof preferences !== "object") {
    return NextResponse.json({ ok: false, error: "missing preferences" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("sc_users")
    .update({ notification_preferences: preferences })
    .eq("id", scUid);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
