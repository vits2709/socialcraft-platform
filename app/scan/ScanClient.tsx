"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ScanResult =
  | { ok: true; already: boolean; points_awarded: number; total_points: number; message: string }
  | { ok: false; error: string };

export default function ScanClient() {
  const sp = useSearchParams();

  const venueId = useMemo(() => {
    return String(sp.get("slug") ?? "").trim();
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
        body: JSON.stringify({ slug: venueId }),
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

  if (!venueId) {
    return (
      <div className="notice" style={{ marginTop: 12 }}>
        QR non valido. Scansiona di nuovo il codice dello spot.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="notice" style={{ marginTop: 12 }}>
        Registrazione presenza in corso...
      </div>
    );
  }

  if (res) {
    return (
      <div className="notice" style={{ marginTop: 12 }}>
        {res.ok
          ? res.message
          : res.error === "not_logged"
            ? "Accedi per registrare la presenza."
            : res.error === "venue_not_found"
              ? "Spot non trovato. Controlla il QR."
              : "Qualcosa è andato storto. Riprova tra poco."}
      </div>
    );
  }

  return null;
}