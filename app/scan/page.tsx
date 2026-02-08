"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ScanResult =
  | { ok: true; venue_id: string; points: number }
  | { ok: false; error: string; remaining_seconds?: number; details?: string };

export default function ScanPage() {
  const sp = useSearchParams();
  const token = useMemo(() => (sp.get("t") ?? "").trim(), [sp]);

  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState<ScanResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setRes(null);

      try {
        const url = token ? `/api/scan?t=${encodeURIComponent(token)}` : `/api/scan`;
        const r = await fetch(url, { method: "POST" });
        const j = (await r.json()) as ScanResult;
        if (!cancelled) setRes(j);
      } catch (e: any) {
        if (!cancelled) setRes({ ok: false, error: "network_error", details: String(e?.message ?? e) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h1 className="h1">Scan</h1>

      {!token ? (
        <div className="notice" style={{ marginTop: 12 }}>
          Mancano i parametri dello scan (token). Scansiona il QR “dinamico” mostrato dalla venue.
        </div>
      ) : null}

      {loading ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Verifica in corso…
        </p>
      ) : null}

      {res ? (
        res.ok ? (
          <div className="notice" style={{ marginTop: 12 }}>
            ✅ Scan valido! Hai guadagnato <b>+{res.points}</b> punto.
            <div className="muted" style={{ marginTop: 6 }}>
              Venue ID: {res.venue_id}
            </div>
          </div>
        ) : (
          <div className="notice" style={{ marginTop: 12 }}>
            ❌ Scan non valido: <b>{res.error}</b>
            {typeof res.remaining_seconds === "number" ? (
              <div className="muted" style={{ marginTop: 6 }}>
                Riprova tra {res.remaining_seconds}s
              </div>
            ) : null}
            {res.details ? (
              <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                {res.details}
              </div>
            ) : null}
          </div>
        )
      ) : null}

      <div style={{ height: 10 }} />
      <a className="btn" href="/">
        Torna alla leaderboard
      </a>
    </div>
  );
}