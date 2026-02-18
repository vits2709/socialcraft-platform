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
          ? "Presenza registrata ✅"
          : res.error === "already_scanned_today" || res.error === "already"
            ? "Hai già registrato la presenza oggi in questo spot ✅"
            : "Qualcosa è andato storto. Riprova tra poco."}
      </div>
    );
  }

  return null;
}