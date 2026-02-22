import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — premi vinti dall'explorer corrente
export async function GET(req: NextRequest) {
  const scUid = req.cookies.get("sc_uid")?.value?.trim();
  if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("weekly_prizes")
    .select("id,week_start,prize_description,prize_image,redemption_code,redemption_code_expires_at,redeemed,redeemed_at,winner_assigned_at,spot_id,venues(name,slug)")
    .eq("winner_user_id", scUid)
    .not("winner_user_id", "is", null)
    .order("week_start", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prizes: data ?? [] });
}
