import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function dayKeyUTC(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function streakFromDayKeys(dayKeys: string[]) {
  // dayKeys: stringhe YYYY-MM-DD (UTC) già uniche
  const set = new Set(dayKeys);
  let streak = 0;

  // oggi in UTC
  const now = new Date();
  const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  // scendi a ritroso finché trovi giorni consecutivi presenti
  const [y, m, d] = todayKey.split("-").map((x) => Number(x));
  let cursor = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

  while (true) {
    const k = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(cursor.getUTCDate()).padStart(2, "0")}`;
    if (!set.has(k)) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
}

type RecentEvent = {
  event_type: string;
  points?: number | null;
  created_at: string;
  venue_id?: string | null;
  venue_name?: string | null;
};

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;
  if (!userId) return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  const todayIso = startOfTodayISO();
  const weekIso = isoDaysAgo(7);
  const monthIso = isoDaysAgo(30);

  // leaderboard row utente (score ufficiale)
  const lbPromise = supabase
    .from("leaderboard_users")
    .select("id,name,score,updated_at")
    .eq("id", String(userId))
    .maybeSingle();

  // eventi per stats
  const todayEventsPromise = supabase
    .from("user_events")
    .select("event_type,points,created_at,venue_id")
    .eq("user_id", userId)
    .gte("created_at", todayIso)
    .order("created_at", { ascending: false })
    .limit(800);

  const weekEventsPromise = supabase
    .from("user_events")
    .select("event_type,points,created_at,venue_id")
    .eq("user_id", userId)
    .gte("created_at", weekIso)
    .order("created_at", { ascending: false })
    .limit(2500);

  const monthEventsPromise = supabase
    .from("user_events")
    .select("event_type,points,created_at,venue_id")
    .eq("user_id", userId)
    .gte("created_at", monthIso)
    .order("created_at", { ascending: false })
    .limit(6000);

  // attività recente
  const recentPromise = supabase
    .from("user_events")
    .select("event_type,points,created_at,venue_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  // ranking (top N e trova indice)
  const rankPromise = supabase
    .from("leaderboard_users")
    .select("id,score")
    .order("score", { ascending: false })
    .limit(2000);

  const [
    { data: lbRow, error: lbErr },
    { data: todayEvents, error: tErr },
    { data: weekEvents, error: wErr },
    { data: monthEvents, error: mErr },
    { data: recentEvents, error: rErr },
    { data: rankRows, error: rankErr },
  ] = await Promise.all([lbPromise, todayEventsPromise, weekEventsPromise, monthEventsPromise, recentPromise, rankPromise]);

  if (lbErr) return NextResponse.json({ ok: false, error: lbErr.message }, { status: 500 });
  if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });
  if (wErr) return NextResponse.json({ ok: false, error: wErr.message }, { status: 500 });
  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });
  if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 });
  if (rankErr) return NextResponse.json({ ok: false, error: rankErr.message }, { status: 500 });

  const score = Number(lbRow?.score ?? 0);

  const scans_today = (todayEvents ?? []).filter((e) => e.event_type === "scan").length;
  const visits_today = (todayEvents ?? []).filter((e) => e.event_type === "confirmed_visit" || e.event_type === "receipt_confirm").length;
  const points_today = (todayEvents ?? []).reduce((acc, e) => acc + Number(e.points ?? 0), 0);

  const scans_7d = (weekEvents ?? []).filter((e) => e.event_type === "scan").length;
  const visits_7d = (weekEvents ?? []).filter((e) => e.event_type === "confirmed_visit" || e.event_type === "receipt_confirm").length;
  const points_7d = (weekEvents ?? []).reduce((acc, e) => acc + Number(e.points ?? 0), 0);

  // streak: giorni consecutivi con almeno 1 scan
  const scanDayKeys_30d = Array.from(
    new Set(
      (monthEvents ?? [])
        .filter((e) => e.event_type === "scan")
        .map((e) => dayKeyUTC(e.created_at))
    )
  );
  const current_streak_days = streakFromDayKeys(scanDayKeys_30d);

  // venue preferita (ultimi 30 giorni): scegli quella con più SCAN, tie-breaker punti
  const venueAgg = new Map<string, { scans: number; points: number }>();
  for (const e of monthEvents ?? []) {
    const vid = e.venue_id ? String(e.venue_id) : null;
    if (!vid) continue;

    const row = venueAgg.get(vid) ?? { scans: 0, points: 0 };
    if (e.event_type === "scan") row.scans += 1;
    row.points += Number(e.points ?? 0);
    venueAgg.set(vid, row);
  }

  let favoriteVenueId: string | null = null;
  let favoriteScans = 0;
  let favoritePoints = 0;

  for (const [vid, v] of venueAgg.entries()) {
    if (v.scans > favoriteScans) {
      favoriteVenueId = vid;
      favoriteScans = v.scans;
      favoritePoints = v.points;
    } else if (v.scans === favoriteScans && v.points > favoritePoints) {
      favoriteVenueId = vid;
      favoriteScans = v.scans;
      favoritePoints = v.points;
    }
  }

  let favoriteVenueName: string | null = null;
  if (favoriteVenueId) {
    const { data: vrow } = await supabase.from("venues").select("id,name").eq("id", favoriteVenueId).maybeSingle();
    favoriteVenueName = vrow?.name ?? null;
  }

  // rank (posizione in classifica, se dentro top 2000)
  let rank: number | null = null;
  const idx = (rankRows ?? []).findIndex((r) => String(r.id) === String(userId));
  if (idx >= 0) rank = idx + 1;

  // risolvi nomi venue per recent list
  const venueIds = Array.from(
    new Set((recentEvents ?? []).map((e) => e.venue_id).filter(Boolean) as string[])
  );

  const venueNameMap = new Map<string, string>();
  if (venueIds.length > 0) {
    const { data: venuesData } = await supabase.from("venues").select("id,name").in("id", venueIds).limit(200);
    (venuesData ?? []).forEach((v) => venueNameMap.set(String(v.id), String(v.name ?? "")));
  }

  const recent: RecentEvent[] = (recentEvents ?? []).map((e) => ({
    event_type: e.event_type,
    points: e.points ?? null,
    created_at: e.created_at,
    venue_id: e.venue_id ?? null,
    venue_name: e.venue_id ? venueNameMap.get(String(e.venue_id)) ?? null : null,
  }));

  // badges (semplici, ma già utili)
  const distinctVenues30d = new Set(Array.from(venueAgg.keys())).size;
  const receiptConfirms30d = (monthEvents ?? []).filter((e) => e.event_type === "receipt_confirm").length;

  const badges: Array<{ id: string; title: string; description: string }> = [];

  if (score >= 100) badges.push({ id: "champion", title: "Champion", description: "Hai superato 100 punti totali" });
  if (scans_7d >= 10) badges.push({ id: "scanner", title: "Scanner", description: "10+ scan negli ultimi 7 giorni" });
  if (distinctVenues30d >= 5) badges.push({ id: "explorer", title: "Explorer", description: "5+ venue diverse in 30 giorni" });
  if (current_streak_days >= 3) badges.push({ id: "regular", title: "Regular", description: "Streak di almeno 3 giorni" });
  if (receiptConfirms30d >= 3) badges.push({ id: "receipt-pro", title: "Receipt Pro", description: "3+ conferme scontrino in 30 giorni" });

  return NextResponse.json({
    ok: true,
    user_id: userId,
    score,
    rank,
    favorite_venue: favoriteVenueId
      ? {
          id: favoriteVenueId,
          name: favoriteVenueName,
          scans_30d: favoriteScans,
          points_30d: favoritePoints,
        }
      : null,
    stats: {
      scans_today,
      visits_today,
      points_today,
      scans_7d,
      visits_7d,
      points_7d,
      active_days_7d: new Set(
        (weekEvents ?? [])
          .filter((e) => e.event_type === "scan")
          .map((e) => dayKeyUTC(e.created_at))
      ).size,
      current_streak_days,
      distinct_venues_30d: distinctVenues30d,
    },
    badges,
    recent,
  });
}