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

    const supabase = createSupabaseAdminClient();

    // user (explorer) da cookie
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    // venue by slug
    const { data: venue, error: vErr } = await supabase
      .from("venues")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    if (!venue) return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });

    // user points
    const { data: user, error: uErr } = await supabase
      .from("sc_users")
      .select("id, points, name")
      .eq("id", scUid)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    if (!user) return NextResponse.json({ ok: false, error: "profile_missing" }, { status: 404 });

    // 1/day check (event_type deve essere 'scan')
    const since = startOfTodayISO();
    const { data: already, error: aErr } = await supabase
      .from("user_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("venue_id", venue.id)
      .eq("event_type", "scan")
      .gte("created_at", since)
      .limit(1);

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

    if (already && already.length > 0) {
      // già fatto oggi: nessun punto
      return NextResponse.json({
        ok: true,
        already: true,
        points_awarded: 0,
        total_points: Number(user.points ?? 0),
        message: "Presenza già registrata oggi ✅ Carica lo scontrino per guadagnare altri punti.",
      });
    }

    // award +2
    const pointsAward = 2;
    const current = Number(user.points ?? 0);
    const newTotal = current + pointsAward;

    // aggiorna sc_users.points
    const { error: upErr } = await supabase.from("sc_users").update({ points: newTotal }).eq("id", user.id);
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    // log user_events (constraint: scan|vote|receipt)
    const { error: ueErr } = await supabase.from("user_events").insert({
      user_id: user.id,
      venue_id: venue.id,
      event_type: "scan",
      points: newTotal,
      points_delta: pointsAward,
    });
    if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

    // log venue_events (constraint: scan|vote)
    const { error: veErr } = await supabase.from("venue_events").insert({
      venue_id: venue.id,
      user_id: user.id,
      event_type: "scan",
    });
    if (veErr) return NextResponse.json({ ok: false, error: veErr.message }, { status: 500 });

    // ✅ aggiorna leaderboard_users (upsert)
    const displayName = (user.name ?? "Guest").toString();
    const { error: lbErr } = await supabase.from("leaderboard_users").upsert(
      {
        id: user.id,
        name: displayName,
        score: newTotal,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (lbErr) return NextResponse.json({ ok: false, error: lbErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      already: false,
      points_awarded: pointsAward,
      total_points: newTotal,
      message: `Presenza registrata ✅ +${pointsAward} punti`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}