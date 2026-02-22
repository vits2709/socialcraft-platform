import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bestActivePromo, applyPromoBonus, type PromoSchedule } from "@/lib/promo-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEO_RADIUS_M = 150;
const AWARD_POINTS = 2;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function todayRange() {
  const day = new Date().toISOString().slice(0, 10);
  return { start: `${day}T00:00:00.000Z`, end: `${day}T23:59:59.999Z` };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) {
      return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "").trim().toUpperCase();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);

    if (!code) {
      return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
    }
    if (!isFinite(lat) || !isFinite(lng)) {
      return NextResponse.json({ ok: false, error: "missing_geo" }, { status: 400 });
    }

    const { data: companion, error: cErr } = await supabase
      .from("companion_codes")
      .select("id, venue_id, creator_id, creator_lat, creator_lng, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
    if (!companion) return NextResponse.json({ ok: false, error: "code_not_found" }, { status: 404 });

    if (new Date(companion.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: "code_expired" }, { status: 410 });
    }

    if (companion.creator_id === scUid) {
      return NextResponse.json({ ok: false, error: "creator_cannot_join" }, { status: 400 });
    }

    const distM = haversine(lat, lng, companion.creator_lat, companion.creator_lng);
    if (distM > GEO_RADIUS_M) {
      return NextResponse.json(
        { ok: false, error: "too_far", distance_m: Math.round(distM) },
        { status: 403 }
      );
    }

    const { data: existingJoin } = await supabase
      .from("companion_joins")
      .select("id")
      .eq("code_id", companion.id)
      .eq("user_id", scUid)
      .maybeSingle();

    if (existingJoin) {
      return NextResponse.json({ ok: false, error: "already_joined" }, { status: 409 });
    }

    const { data: user, error: uErr } = await supabase
      .from("sc_users")
      .select("id, points")
      .eq("id", scUid)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    if (!user) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

    const { start, end } = todayRange();
    const { count: alreadyCount } = await supabase
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", scUid)
      .eq("venue_id", companion.venue_id)
      .eq("event_type", "scan")
      .gte("created_at", start)
      .lte("created_at", end);

    const alreadyCheckedIn = (alreadyCount ?? 0) > 0;

    const { data: venue } = await supabase
      .from("venues")
      .select("id, name, slug")
      .eq("id", companion.venue_id)
      .maybeSingle();

    let finalPoints = 0;
    let promo = null;

    if (!alreadyCheckedIn) {
      const { data: promoRows } = await supabase
        .from("venue_promos")
        .select("id,title,is_active,bonus_type,bonus_value,days_of_week,time_start,time_end,date_start,date_end")
        .eq("venue_id", companion.venue_id)
        .eq("is_active", true);

      promo = bestActivePromo((promoRows ?? []) as PromoSchedule[], AWARD_POINTS);
      finalPoints = promo ? applyPromoBonus(AWARD_POINTS, promo) : AWARD_POINTS;

      const newTotal = Number(user.points ?? 0) + finalPoints;

      const { error: upErr } = await supabase
        .from("sc_users")
        .update({ points: newTotal, updated_at: new Date().toISOString() })
        .eq("id", scUid);

      if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

      const { error: ueErr } = await supabase.from("user_events").insert({
        user_id: scUid,
        venue_id: companion.venue_id,
        event_type: "scan",
        points: finalPoints,
        points_delta: finalPoints,
        geo_verified: true,
      });

      if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

      supabase
        .from("venue_events")
        .insert({ venue_id: companion.venue_id, user_id: scUid, event_type: "scan" })
        .then(() => {});
    }

    await supabase
      .from("companion_joins")
      .insert({ code_id: companion.id, user_id: scUid });

    const { count: prevJoins } = await supabase
      .from("companion_joins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", scUid);

    const isFirstGroupCheckin = (prevJoins ?? 0) <= 1;

    let badgeUnlocked = false;
    if (isFirstGroupCheckin) {
      const { data: existing } = await supabase
        .from("user_badge_unlocks")
        .select("id")
        .eq("user_id", scUid)
        .eq("badge_id", "in_compagnia")
        .maybeSingle();

      if (!existing) {
        await supabase
          .from("user_badge_unlocks")
          .insert({ user_id: scUid, badge_id: "in_compagnia" });
        badgeUnlocked = true;
      }
    }

    return NextResponse.json({
      ok: true,
      already_checked_in: alreadyCheckedIn,
      points_awarded: finalPoints,
      venue_name: venue?.name ?? "",
      venue_slug: venue?.slug ?? "",
      badge_unlocked: badgeUnlocked,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
