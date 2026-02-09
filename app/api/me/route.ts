import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  // 1) ensure sc_users row
  let profile: any = null;

  // prova con colonne nuove
  {
    const { data, error } = await supabase
      .from("sc_users")
      .select("id,name,nickname_locked,created_at")
      .eq("id", userId)
      .maybeSingle();

    if (!error) profile = data;
  }

  // fallback se select sopra fallisce per schema cache
  if (!profile) {
    const { data } = await supabase
      .from("sc_users")
      .select("id,created_at")
      .eq("id", userId)
      .maybeSingle();
    profile = data ?? null;
  }

  if (!profile) {
    const { data: inserted, error: insErr } = await supabase
      .from("sc_users")
      .insert({ id: userId })
      .select("id,name,nickname_locked,created_at")
      .single();

    if (insErr) {
      return NextResponse.json({ ok: false, error: `ensure_sc_user_failed: ${insErr.message}` }, { status: 500 });
    }
    profile = inserted;
  }

  // 2) stats base da user_events
  const { data: events, error: evErr } = await supabase
    .from("user_events")
    .select("id,created_at,event_type,points,venue_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (evErr) {
    return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });
  }

  const evs = events ?? [];

  const points_total = evs.reduce((acc, e) => acc + Number(e.points ?? 0), 0);
  const scans_total = evs.filter((e) => e.event_type === "scan").length;

  const venuesSet = new Set<string>();
  for (const e of evs) if (e.venue_id) venuesSet.add(String(e.venue_id));
  const venues_distinct = venuesSet.size;

  // ultimi 7 giorni
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last7 = evs.filter((e) => new Date(e.created_at).getTime() >= since7.getTime());
  const last_7d_points = last7.reduce((acc, e) => acc + Number(e.points ?? 0), 0);
  const last_7d_scans = last7.filter((e) => e.event_type === "scan").length;

  // giorni attivi su 7
  const daysSet = new Set<string>();
  for (const e of last7) {
    const d = new Date(e.created_at);
    daysSet.add(startOfDayISO(d));
  }
  const active_days_7d = daysSet.size;

  // favorite venue (più scan)
  const scanCounts = new Map<string, number>();
  for (const e of evs) {
    if (e.event_type !== "scan" || !e.venue_id) continue;
    const k = String(e.venue_id);
    scanCounts.set(k, (scanCounts.get(k) ?? 0) + 1);
  }
  let favId: string | null = null;
  let favCount = 0;
  for (const [k, c] of scanCounts.entries()) {
    if (c > favCount) {
      favCount = c;
      favId = k;
    }
  }

  let favorite_venue: { id: string; name: string } | null = null;
  if (favId) {
    const { data: v } = await supabase.from("venues").select("id,name").eq("id", favId).maybeSingle();
    if (v?.id) favorite_venue = { id: String(v.id), name: String(v.name ?? "Venue") };
  }

  // 3) recent events join venue names
  const venueIds = Array.from(new Set(evs.map((e) => e.venue_id).filter(Boolean).map(String)));
  let venueMap = new Map<string, { id: string; name: string | null }>();

  if (venueIds.length > 0) {
    const { data: vs } = await supabase.from("venues").select("id,name").in("id", venueIds);
    for (const v of vs ?? []) venueMap.set(String(v.id), { id: String(v.id), name: v.name ?? null });
  }

  const recent = evs.slice(0, 30).map((e) => {
    const vid = e.venue_id ? String(e.venue_id) : null;
    const vn = vid ? venueMap.get(vid)?.name ?? null : null;
    return {
      id: String(e.id),
      created_at: String(e.created_at),
      event_type: String(e.event_type),
      points: e.points ?? null,
      venue_id: vid,
      venue_name: vn,
    };
  });

  // 4) badges (semplici ma carini)
  // Scanner: scans_total -> target 10/30/80 (progress su target corrente)
  const makeBadge = (key: string, title: string, subtitle: string, current: number, targets: [number, number, number], hint: string) => {
    const [t1, t2, t3] = targets;
    let target = t1;
    if (current >= t2) target = t3;
    else if (current >= t1) target = t2;

    const progress = Math.min(1, current / target);
    const level =
      current >= t3 ? "GOLD" : current >= t2 ? "SILVER" : "BRONZE";

    return { key, title, subtitle, current, target, progress, level, hint };
  };

  const badges = [
    makeBadge(
      "scanner",
      "Scanner",
      "Scan settimanali",
      last_7d_scans,
      [3, 8, 16],
      "Scansiona nelle venue per salire. Più scan in 7 giorni = livello più alto."
    ),
    makeBadge(
      "explorer",
      "Explorer",
      "Venue diverse",
      venues_distinct,
      [3, 8, 20],
      "Esplora venue diverse per sbloccare bonus social."
    ),
    makeBadge(
      "streak",
      "Streak",
      "Costanza giornaliera",
      active_days_7d,
      [2, 4, 7],
      "Più giorni attivi su 7 = streak più forte."
    ),
    makeBadge(
      "points",
      "Punti Totali",
      "Crescita generale",
      points_total,
      [50, 200, 500],
      "Accumula punti con scan e visite confermate."
    ),
  ].map((b: any) => ({
    ...b,
    // coerente col tipo client
    level: b.level,
  }));

  return NextResponse.json({
    ok: true,
    user: {
      id: String(profile.id),
      name: profile.name ?? null,
      nickname_locked: Boolean(profile.nickname_locked ?? false),
      created_at: profile.created_at ?? null,
    },
    stats: {
      points_total,
      scans_total,
      venues_distinct,
      favorite_venue,
      last_7d_points,
      last_7d_scans,
      active_days_7d,
    },
    badges,
    recent,
  });
}