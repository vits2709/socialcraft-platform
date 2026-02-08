"use client";

import { useState } from "react";

export default function ScanButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleScan() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ slug })
      });

      const data = await res.json();

      if (!data.ok) {
        setMsg("Errore: " + data.error);
      } else {
        setMsg("Visita registrata! +" + data.points + " punti");
      }

    } catch (e) {
      setMsg("Errore di rete");
    }

    setLoading(false);
  }

  return (
    <div>
      <button className="btn" onClick={handleScan} disabled={loading}>
        {loading ? "Registrazione..." : "Registra visita"}
      </button>

      {msg && (
        <div className="notice" style={{ marginTop: 10 }}>
          {msg}
        </div>
      )}
    </div>
  );
}