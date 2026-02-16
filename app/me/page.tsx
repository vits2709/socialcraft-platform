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
    points_total: number;
    scans_today?: number;
    receipts_today?: number;
    votes_today?: number;
  };
  error?: string;
};

function n(v: unknown, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<MePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const stats = useMemo(() => {
    const s = payload?.stats;
    return {
      points_total: n(s?.points_total, 0),
      scans_today: n(s?.scans_today, 0),
      receipts_today: n(s?.receipts_today, 0),
      votes_today: n(s?.votes_today, 0),
    };
  }, [payload]);

  const user = useMemo(() => {
    const u = payload?.user;
    return {
      id: u?.id ?? "",
      name: (u?.name ?? "Guest").toString(),
      points: n(u?.points, 0),
      created_at: u?.created_at ?? null,
    };
  }, [payload]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/me", { method: "GET", cache: "no-store" });
      const data: MePayload = await res.json().catch(() => ({ ok: false, error: "bad_json" }));

      if (!data?.ok) {
        setPayload(null);
        setErr(data?.error ?? "load_failed");
      } else {
        // garantiamo struttura minima per evitare crash UI anche se manca qualcosa
        const safe: MePayload = {
          ok: true,
          user: data.user ?? { id: "" },
          stats: data.stats ?? { points_total: 0, scans_today: 0, receipts_today: 0, votes_today: 0 },
        };
        setPayload(safe);
      }
    } catch {
      setPayload(null);
      setErr("network_error");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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

      <div className="notice" style={{ padding: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Statistiche</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div className="card">
            <div className="muted">Punti totali</div>
            <div className="statValue">{loading ? "…" : stats.points_total.toLocaleString("it-IT")}</div>
          </div>

          <div className="card">
            <div className="muted">Presenze oggi</div>
            <div className="statValue">{loading ? "…" : stats.scans_today.toLocaleString("it-IT")}</div>
          </div>

          <div className="card">
            <div className="muted">Scontrini oggi</div>
            <div className="statValue">{loading ? "…" : stats.receipts_today.toLocaleString("it-IT")}</div>
          </div>

          <div className="card">
            <div className="muted">Voti oggi</div>
            <div className="statValue">{loading ? "…" : stats.votes_today.toLocaleString("it-IT")}</div>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          Nota: “Punti totali” viene dalla route /api/me (campo stats.points_total).
        </div>
      </div>
    </div>
  );
}