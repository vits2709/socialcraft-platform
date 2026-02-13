import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const { data: u, error: uErr } = await supabase
      .from("sc_users")
      .select("id,name,points")
      .eq("id", scUid)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    if (!u) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

    const { count: scansTotal } = await supabase
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", scUid)
      .eq("event_type", "scan");

    const { count: venuesVisited } = await supabase
      .from("user_events")
      .select("venue_id", { count: "exact", head: true })
      .eq("user_id", scUid)
      .eq("event_type", "scan"); // semplice, poi miglioreremo “distinct venue_id” se vuoi

    return NextResponse.json({
      ok: true,
      name: u.name,
      total_points: u.points,
      scans_total: scansTotal ?? 0,
      venues_visited: venuesVisited ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}