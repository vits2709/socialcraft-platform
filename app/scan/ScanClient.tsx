"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ScanResult =
  | { ok: true; venue_id: string; points: number }
  | { ok: false; error: string };

export default function ScanClient() {
  const sp = useSearchParams();

  const venueId = useMemo(() => {
    // supporta più chiavi: ?venue_id= oppure ?id=
    return String(sp.get("venue_id") ?? sp.get("id") ?? "").trim();
  }, [sp]);

  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ScanResult | null>(null);

  async function doScan() {
    setLoading(true);
    setRes(null);

    try {
      const r = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: venueId }),
      });

      const j = (await r.json()) as ScanResult;
      setRes(j);
    } catch (e: any) {
      setRes({ ok: false, error: e?.message || "network_error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // auto-scan se c’è venue_id
    if (!venueId) return;
    void doScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  return (
    <div style={{ marginTop: 12 }}>
      <div className="notice">
        <b>venue_id:</b>{" "}
        {venueId ? <code>{venueId}</code> : <span className="muted">mancante (aggiungi ?venue_id=...)</span>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn" onClick={doScan} disabled={loading || !venueId}>
          {loading ? "Sto registrando…" : "Registra scan"}
        </button>
      </div>

      {res ? (
        <div className="notice" style={{ marginTop: 12 }}>
          {res.ok ? (
            <>
              ✅ OK — punti: <b>{res.points}</b> — venue_id: <code>{res.venue_id}</code>
            </>
          ) : (
            <>
              ❌ ERRORE — <code>{res.error}</code>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}