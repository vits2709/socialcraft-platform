"use client";

import { useEffect, useMemo, useState } from "react";

type MePayload = {
  ok: boolean;
  user?: {
    id: string;
    name?: string | null;
    points?: number | null;
    created_at?: string | null;
  };
  stats?: {
    points_total?: number;
    scans_today?: number;
    receipts_today?: number;
    votes_today?: number;
  };
  error?: string;
};

type ProfileStatsPayload = {
  ok: boolean;
  stats?: {
    // punti
    points_total?: number;

    // oggi
    scans_today?: number;
    receipts_today?: number;
    votes_today?: number;

    // totali
    scans_total?: number;
    venues_visited?: number;
    favorite_venue_name?: string | null;

    // streak
    streak_days?: number;
    best_streak_days?: number;
    last_scan_day?: string | null; // "2026-02-16"

    // livelli
    level?: number;
    level_title?: string | null;
    level_current?: number; // punti dentro al livello
    level_next?: number; // soglia pross. livello
    level_progress?: number; // 0..1 (se già calcolato lato backend)

    // ultimi 7 giorni
    last7_days?: number;
    last7_scans?: number;
    last7_points?: number;
  };
  error?: string;
};

function n(v: unknown, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function clamp01(x: number) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

// fallback livelli (se backend non manda nulla)
// puoi cambiare queste soglie come vuoi
function computeLevelFromPoints(pointsTotal: number) {
  // soglie cumulative
  const thresholds = [0, 20, 60, 120, 200, 300, 450, 650, 900, 1200];
  let lvl = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (pointsTotal >= thresholds[i]) lvl = i + 1;
  }
  const curBase = thresholds[Math.max(0, lvl - 1)] ?? 0;
  const nextBase = thresholds[Math.min(thresholds.length - 1, lvl)] ?? (curBase + 200);
  const inLevel = pointsTotal - curBase;
  const toNext = Math.max(0, nextBase - pointsTotal);
  const progress = nextBase > curBase ? inLevel / (nextBase - curBase) : 1;
  return {
    level: lvl,
    title: lvl >= 6 ? "Veterano" : lvl >= 3 ? "Explorer" : "Rookie",
    level_current: inLevel,
    level_next: nextBase - curBase,
    points_to_next: toNext,
    progress: clamp01(progress),
  };
}

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MePayload | null>(null);
  const [ps, setPs] = useState<ProfileStatsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [meRes, psRes] = await Promise.all([
        fetch("/api/me", { method: "GET", cache: "no-store" }).catch(() => null),
        fetch("/api/profile/stats", { method: "GET", cache: "no-store" }).catch(() => null),
      ]);

      const meData: MePayload =
        (meRes && (await meRes.json().catch(() => ({ ok: false, error: "bad_json_me" })))) ||
        ({ ok: false, error: "network_me" } as any);

      const psData: ProfileStatsPayload =
        (psRes && (await psRes.json().catch(() => ({ ok: false, error: "bad_json_profile_stats" })))) ||
        ({ ok: false, error: "network_profile_stats" } as any);

      if (!meData?.ok) {
        setMe(null);
        setPs(null);
        setErr(meData?.error ?? "load_failed");
      } else {
        setMe(meData);
        setPs(psData?.ok ? psData : null);
      }
    } catch {
      setMe(null);
      setPs(null);
      setErr("network_error");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const user = useMemo(() => {
    const u = me?.user;
    return {
      id: u?.id ?? "",
      name: (u?.name ?? "Guest").toString(),
      points: n(u?.points, 0),
      created_at: u?.created_at ?? null,
    };
  }, [me]);

  const merged = useMemo(() => {
    const a = ps?.stats ?? {};
    const b = me?.stats ?? {};

    const scansToday = n(a.scans_today, n(b.scans_today, 0));
    const receiptsToday = n(a.receipts_today, n(b.receipts_today, 0));
    const votesToday = n(a.votes_today, n(b.votes_today, 0));

    const pointsTotal = n(a.points_total, n(b.points_total, user.points));

    const streak = n(a.streak_days, 0);
    const bestStreak = n(a.best_streak_days, 0);

    const levelFromBackend = {
      level: n(a.level, 0),
      title: (a.level_title ?? "").toString(),
      level_current: n(a.level_current, 0),
      level_next: n(a.level_next, 0),
      level_progress: Number.isFinite(Number(a.level_progress)) ? clamp01(Number(a.level_progress)) : null,
    };

    const fallbackLvl = computeLevelFromPoints(pointsTotal);

    const level =
      levelFromBackend.level > 0 ? levelFromBackend.level : fallbackLvl.level;

    const levelTitle =
      levelFromBackend.title?.trim()
        ? levelFromBackend.title
        : fallbackLvl.title;

    // progress:
    let progress = fallbackLvl.progress;
    let pointsToNext = fallbackLvl.points_to_next;
    let levelCurrent = fallbackLvl.level_current;
    let levelNext = fallbackLvl.level_next;

    if (levelFromBackend.level_next > 0) {
      levelCurrent = levelFromBackend.level_current;
      levelNext = levelFromBackend.level_next;
      pointsToNext = Math.max(0, levelNext - levelCurrent);
      progress =
        levelFromBackend.level_progress !== null
          ? levelFromBackend.level_progress
          : (levelNext > 0 ? clamp01(levelCurrent / levelNext) : 0);
    }

    return {
      // base
      points_total: pointsTotal,
      scans_today: scansToday,
      receipts_today: receiptsToday,
      votes_today: votesToday,

      scans_total: n(a.scans_total, 0),
      venues_visited: n(a.venues_visited, 0),
      favorite_venue_name: (a.favorite_venue_name ?? null) as string | null,

      // streak
      streak_days: streak,
      best_streak_days: bestStreak,
      last_scan_day: (a.last_scan_day ?? null) as string | null,

      // level
      level,
      level_title: levelTitle,
      level_current: levelCurrent,
      level_next: levelNext,
      points_to_next: pointsToNext,
      level_progress: clamp01(progress),

      // last7
      last7_days: n(a.last7_days, 7),
      last7_scans: n(a.last7_scans, 0),
      last7_points: n(a.last7_points, 0),
    };
  }, [ps, me, user.points]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Il mio profilo</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Badge, streak, livelli e statistiche.
            </div>
          </div>

          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Carico..." : "Aggiorna"}
          </button>
        </div>
      </div>

      {err ? (
        <div className="notice" style={{ padding: 14 }}>
          <div style={{ fontWeight: 800 }}>Errore</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {err}
          </div>
        </div>
      ) : null}

      {/* HEADER UTENTE */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Utente</div>
            <div className="muted" style={{ marginTop: 6 }}>
              {loading ? "…" : user.name}{" "}
              {user.id ? (
                <span className="muted" style={{ marginLeft: 8 }}>
                  (ID: <b>{user.id}</b>)
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div className="muted">Punti (profilo)</div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>
              {loading ? "…" : user.points.toLocaleString("it-IT")}
            </div>
          </div>
        </div>
      </div>

      {/* BADGE TOP (ripristino completo) */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Badge</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Oggi, streak e livello.
            </div>
          </div>

          <span className="badge" title="Punti totali">
            <span className="dot" /> {loading ? "…" : `${merged.points_total.toLocaleString("it-IT")} pt`}
          </span>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className="badge" title="Presenze oggi">
            <span className="dot" /> Presenze oggi: <b style={{ marginLeft: 6 }}>{loading ? "…" : merged.scans_today}</b>
          </span>
          <span className="badge" title="Scontrini oggi">
            <span className="dot" /> Scontrini oggi: <b style={{ marginLeft: 6 }}>{loading ? "…" : merged.receipts_today}</b>
          </span>
          <span className="badge" title="Voti oggi">
            <span className="dot" /> Voti oggi: <b style={{ marginLeft: 6 }}>{loading ? "…" : merged.votes_today}</b>
          </span>

          <span className="badge" title="Streak attuale">
            <span className="dot" /> Streak:{" "}
            <b style={{ marginLeft: 6 }}>
              {loading ? "…" : `${merged.streak_days}g`}
            </b>
          </span>

          <span className="badge" title="Best streak">
            <span className="dot" /> Best:{" "}
            <b style={{ marginLeft: 6 }}>
              {loading ? "…" : `${merged.best_streak_days}g`}
            </b>
          </span>

          <span className="badge" title="Scan totali">
            <span className="dot" /> Scan totali:{" "}
            <b style={{ marginLeft: 6 }}>
              {loading ? "…" : merged.scans_total.toLocaleString("it-IT")}
            </b>
          </span>

          <span className="badge" title="Livello">
            <span className="dot" /> Livello:{" "}
            <b style={{ marginLeft: 6 }}>
              {loading ? "…" : `${merged.level} · ${merged.level_title}`}
            </b>
          </span>
        </div>

        {/* PROGRESS LIVELLO */}
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span>
              Prossimo livello:{" "}
              <b>{loading ? "…" : `${merged.points_to_next.toLocaleString("it-IT")} pt`}</b>
            </span>
            <span>
              {loading
                ? "…"
                : `${merged.level_current.toLocaleString("it-IT")}/${merged.level_next.toLocaleString("it-IT")}`}
            </span>
          </div>

          <div
            style={{
              marginTop: 8,
              height: 10,
              borderRadius: 999,
              background: "rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round(merged.level_progress * 100)}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #6D5BFF, #FF4FB5)",
              }}
            />
          </div>
        </div>
      </div>

      {/* OVERVIEW */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Overview</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div className="card">
            <div className="muted">Punti totali</div>
            <div className="statValue">{loading ? "…" : merged.points_total.toLocaleString("it-IT")}</div>
          </div>

          <div className="card">
            <div className="muted">Scan totali</div>
            <div className="statValue">{loading ? "…" : merged.scans_total.toLocaleString("it-IT")}</div>
          </div>

          <div className="card">
            <div className="muted">Spot visitati</div>
            <div className="statValue">{loading ? "…" : merged.venues_visited.toLocaleString("it-IT")}</div>
          </div>

          <div className="card">
            <div className="muted">Spot preferito</div>
            <div className="statValue">{loading ? "…" : merged.favorite_venue_name || "—"}</div>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          Ultimi {merged.last7_days} giorni:{" "}
          <b>
            {loading ? "…" : `${merged.last7_scans} scan · ${merged.last7_points} punti`}
          </b>
        </div>
      </div>
    </div>
  );
}