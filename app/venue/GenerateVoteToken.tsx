"use client";

import { useState } from "react";

export default function GenerateVoteToken({ venueId }: { venueId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setMsg(null);
    setLink(null);

    const res = await fetch("/api/venue/generate-vote-token", { method: "POST" });
    const json = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      setMsg(json?.error ?? "Errore generazione token");
      return;
    }

    const token = json.token as string;
    const url = `${window.location.origin}/rate/${venueId}?t=${encodeURIComponent(token)}`;
    setLink(url);

    // Auto-clear after ~2 minutes (UI only)
    setTimeout(() => setLink(null), 125000);
  }

  return (
    <div>
      <div className="btnRow">
        <button className="btn btnPrimary" onClick={generate} disabled={loading}>
          {loading ? "Genero..." : "Genera QR voto (2 min)"}
        </button>
      </div>

      {msg ? <div className="notice" style={{ marginTop: 12 }}>{msg}</div> : null}

      {link ? (
        <div className="notice" style={{ marginTop: 12 }}>
          <div><b>Link da mostrare in sede (scade ~2 min):</b></div>
          <div style={{ wordBreak: "break-all", marginTop: 6 }}>{link}</div>
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 10 }}>
          Mostra questo link/QR al banco: ogni generazione vale per un solo voto e scade in ~2 minuti.
        </div>
      )}
    </div>
  );
}
