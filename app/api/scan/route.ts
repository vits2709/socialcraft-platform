import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json().catch(() => ({} as any));
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    // ✅ Explorer session: cookie sc_uid (NON supabase auth user)
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const supabase = createSupabaseAdminClient();

    // 1) venue by slug
    const { data: venue, error: vErr } = await supabase
      .from("venues")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    if (!venue) return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });

    // 2) sc_user profile
    const { data: scUser, error: uErr } = await supabase
      .from("sc_users")
      .select("id, points")
      .eq("id", scUid)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    if (!scUser) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

    // 3) 1/day check (event_type MUST be 'scan' per tuo CHECK)
    const since = startOfTodayISO();
    const { data: already, error: aErr } = await supabase
      .from("user_events")
      .select("id")
      .eq("user_id", scUser.id)
      .eq("venue_id", venue.id)
      .eq("event_type", "scan")
      .gte("created_at", since)
      .limit(1);

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

    if (already && already.length > 0) {
      return NextResponse.json({
        ok: true,
        already: true,
        points_awarded: 0,
        total_points: Number(scUser.points ?? 0),
        message: "Presenza già registrata oggi ✅ Carica lo scontrino per +8.",
      });
    }

    // 4) award +2
    const award = 2;
    const total = Number(scUser.points ?? 0) + award;

    // insert event
    const { error: evErr } = await supabase.from("user_events").insert({
      user_id: scUser.id,
      venue_id: venue.id,
      event_type: "scan",
      points: award,        // ✅ colonna esiste
      points_delta: award,  // ✅ colonna esiste
    });

    if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });

    // update user total points
    const { error: upErr } = await supabase.from("sc_users").update({ points: total }).eq("id", scUser.id);
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      already: false,
      points_awarded: award,
      total_points: total,
      message: `Presenza registrata ✅ +${award} punti`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}