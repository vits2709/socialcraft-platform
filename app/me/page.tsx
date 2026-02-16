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
    // campi “ricchi” (se esistono nella tua route)
    points_total?: number;
    scans_total?: number;
    venues_visited?: number;
    favorite_venue_name?: string | null;

    // “oggi”
    scans_today?: number;
    receipts_today?: number;
    votes_today?: number;

    // ultimi 7 giorni (se li hai)
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
    // 1) stats da /api/profile/stats (se c’è)
    const a = ps?.stats ?? {};
    // 2) stats da /api/me (fallback)
    const b = me?.stats ?? {};

    const scansToday = n(a.scans_today, n(b.scans_today, 0));
    const receiptsToday = n(a.receipts_today, n(b.receipts_today, 0));
    const votesToday = n(a.votes_today, n(b.votes_today, 0));

    // points_total: se non arriva dalla route → usa user.points (così non vedi mai 0 se hai punti reali)
    const pointsTotal = n(a.points_total, n(b.points_total, user.points));

    return {
      points_total: pointsTotal,
      scans_today: scansToday,
      receipts_today: receiptsToday,
      votes_today: votesToday,

      scans_total: n(a.scans_total, 0),
      venues_visited: n(a.venues_visited, 0),
      favorite_venue_name: (a.favorite_venue_name ?? null) as string | null,

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
              Qui vedi i tuoi punti e le statistiche.
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
            <div style={{ fontWeight: 900, fontSize: 22 }}>{loading ? "…" : user.points.toLocaleString("it-IT")}</div>
          </div>
        </div>
      </div>

      {/* BADGE “OGGI” (ripristino) */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Badge di oggi</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Presenza, scontrino, voto (se disponibili).
            </div>
          </div>

          <span className="badge" title="Totale punti">
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
        </div>
      </div>

      {/* OVERVIEW (ripristino card) */}
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