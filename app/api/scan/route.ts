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

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "missing_slug" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // 1) Trova venue
    const { data: venue, error: vErr } = await supabase
      .from("venues")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (vErr) {
      return NextResponse.json(
        { ok: false, error: vErr.message },
        { status: 500 }
      );
    }

    if (!venue) {
      return NextResponse.json(
        { ok: false, error: "venue_not_found" },
        { status: 404 }
      );
    }

    // 2) User dal cookie
    const scUid = req.cookies.get("sc_uid")?.value?.trim();

    if (!scUid) {
      return NextResponse.json(
        { ok: false, error: "not_logged" },
        { status: 401 }
      );
    }

    const { data: user, error: uErr } = await supabase
      .from("sc_users")
      .select("id, points")
      .eq("id", scUid)
      .maybeSingle();

    if (uErr) {
      return NextResponse.json(
        { ok: false, error: uErr.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "profile_missing" },
        { status: 404 }
      );
    }

    // 3) Controllo presenza già oggi
    const since = startOfTodayISO();

    const { data: alreadyEv, error: aErr } = await supabase
      .from("user_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("venue_id", venue.id)
      .eq("event_type", "confirmed_visit")
      .gte("created_at", since)
      .limit(1);

    if (aErr) {
      return NextResponse.json(
        { ok: false, error: aErr.message },
        { status: 500 }
      );
    }

    if (alreadyEv && alreadyEv.length > 0) {
      return NextResponse.json({
        ok: true,
        already: true,
        points_awarded: 0,
        message:
          "Presenza già registrata oggi ✅ Carica lo scontrino per guadagnare altri punti.",
      });
    }

    // 4) Assegna punti
    const pointsAward = 2;

    const { error: evErr1 } = await supabase.from("user_events").insert({
      user_id: user.id,
      venue_id: venue.id,
      event_type: "scan_visit",
      points_delta: pointsAward,
      meta: { slug },
    });

    if (evErr1) {
      return NextResponse.json(
        { ok: false, error: evErr1.message },
        { status: 500 }
      );
    }

    const { error: upErr } = await supabase
      .from("sc_users")
      .update({ points: (user.points || 0) + pointsAward })
      .eq("id", user.id);

    if (upErr) {
      return NextResponse.json(
        { ok: false, error: upErr.message },
        { status: 500 }
      );
    }

    const { error: evErr2 } = await supabase.from("user_events").insert({
      user_id: user.id,
      venue_id: venue.id,
      event_type: "confirmed_visit",
      points_delta: 0,
      meta: { slug },
    });

    if (evErr2) {
      return NextResponse.json(
        { ok: false, error: evErr2.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      already: false,
      points_awarded: pointsAward,
      message: `Presenza registrata ✅ +${pointsAward} punti`,
    });

  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown" },
      { status: 500 }
    );
  }
}