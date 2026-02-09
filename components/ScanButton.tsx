"use client";

import { useState } from "react";

export default function ScanButton({ venueId }: { venueId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onScan() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: venueId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setMsg(`Errore: ${json?.error || "scan_failed"}`);
        return;
      }

      setMsg(`+${json.points ?? 0} punti`);
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "network_error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button className="btn" onClick={onScan} disabled={loading}>
        {loading ? "Registrando..." : "Registra visita"}
      </button>

      {msg ? <div className="notice">{msg}</div> : null}
    </div>
  );
}