import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isoDay(d: Date) {
  // YYYY-MM-DD in UTC
  return d.toISOString().slice(0, 10);
}

function parseDay(s: string) {
  // s = YYYY-MM-DD
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function daysDiff(a: string, b: string) {
  // a,b YYYY-MM-DD (UTC)
  const da = parseDay(a).getTime();
  const db = parseDay(b).getTime();
  return Math.round((da - db) / 86400000);
}

function computeStreaks(scanDays: string[]) {
  // scanDays: unique sorted asc
  if (!scanDays.length) return { streak: 0, best: 0, lastDay: null as string | null };

  const sorted = [...scanDays].sort(); // asc
  const lastDay = sorted[sorted.length - 1];

  // best streak
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const now = sorted[i];
    if (daysDiff(now, prev) === 1) cur++;
    else cur = 1;
    if (cur > best) best = cur;
  }

  // current streak (ending at today OR ending at lastDay)
  const today = isoDay(new Date());
  let streak = 1;
  let end = lastDay;

  // se l’ultimo scan è oggi, streak continua fino a oggi
  // se l’ultimo scan è ieri, streak “attuale” vale fino a ieri (streak comunque utile)
  // se è più vecchio, streak=1
  const diffToToday = daysDiff(today, lastDay);
  if (diffToToday === 0 || diffToToday === 1) {
    // calcola all’indietro partendo da lastDay
    streak = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const prev = sorted[i];
      const next = sorted[i + 1];
      if (daysDiff(next, prev) === 1) streak++;
      else break;
    }
  } else {
    streak = 1;
  }

  return { streak, best, lastDay: end };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    // 1) utente + punti veri
    const { data: u, error: uErr } = await supabase
      .from("sc_users")
      .select("id,name,points,updated_at")
      .eq("id", scUid)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    if (!u) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

    const today = isoDay(new Date());

    // 2) oggi: scans/receipts/votes + totali receipt/vote
    const [
      { count: scansToday },
      { count: receiptsToday },
      { count: votesToday },
      { count: receiptsTotal },
      { count: votesTotal },
    ] = await Promise.all([
      supabase
        .from("user_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", scUid)
        .eq("event_type", "scan")
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lte("created_at", `${today}T23:59:59.999Z`),

      supabase
        .from("user_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", scUid)
        .eq("event_type", "receipt")
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lte("created_at", `${today}T23:59:59.999Z`),

      supabase
        .from("user_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", scUid)
        .eq("event_type", "vote")
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lte("created_at", `${today}T23:59:59.999Z`),

      supabase
        .from("user_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", scUid)
        .eq("event_type", "receipt"),

      supabase
        .from("user_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", scUid)
        .eq("event_type", "vote"),
    ]);

    // 3) totali scan
    const { count: scansTotal } = await supabase
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", scUid)
      .eq("event_type", "scan");

    // 4) spot visitati (distinct venue_id) + scanDays per streak
    const { data: scanRows, error: scanRowsErr } = await supabase
      .from("user_events")
      .select("venue_id, created_at")
      .eq("user_id", scUid)
      .eq("event_type", "scan")
      .order("created_at", { ascending: true });

    if (scanRowsErr) return NextResponse.json({ ok: false, error: scanRowsErr.message }, { status: 500 });

    const venueSet = new Set<string>();
    const daySet = new Set<string>();

    for (const r of scanRows ?? []) {
      if (r?.venue_id) venueSet.add(String(r.venue_id));
      if (r?.created_at) {
        const d = isoDay(new Date(r.created_at));
        daySet.add(d);
      }
    }

    const scanDays = [...daySet].sort();
    const streakInfo = computeStreaks(scanDays);

    // 5) ultimi 7 giorni: scans + punti (somma points_delta)
    const from7 = (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 6);
      return isoDay(d);
    })();

    const { data: last7Rows, error: last7Err } = await supabase
      .from("user_events")
      .select("event_type, points_delta, created_at")
      .eq("user_id", scUid)
      .gte("created_at", `${from7}T00:00:00.000Z`)
      .lte("created_at", `${today}T23:59:59.999Z`);

    if (last7Err) return NextResponse.json({ ok: false, error: last7Err.message }, { status: 500 });

    let last7Scans = 0;
    let last7Points = 0;
    for (const r of last7Rows ?? []) {
      if (r?.event_type === "scan") last7Scans++;
      last7Points += Number(r?.points_delta ?? 0) || 0;
    }

    return NextResponse.json({
      ok: true,
      stats: {
        points_total: Number(u.points ?? 0),

        scans_today: scansToday ?? 0,
        receipts_today: receiptsToday ?? 0,
        votes_today: votesToday ?? 0,

        scans_total: scansTotal ?? 0,
        venues_visited: venueSet.size,

        streak_days: streakInfo.streak,
        best_streak_days: streakInfo.best,
        last_scan_day: streakInfo.lastDay,

        last7_days: 7,
        last7_scans: last7Scans,
        last7_points: last7Points,

        receipts_total: receiptsTotal ?? 0,
        votes_total: votesTotal ?? 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}