"use client";

import { useEffect, useMemo, useState } from "react";

const TTL_SECONDS = 120;

// ✅ METTI QUI LA TUA ROUTE REALE
// Deve ritornare JSON del tipo:
// { ok:true, url:"https://.../vote?token=...", expiresAt:"2026-..." }
// oppure almeno { ok:true, token:"...", url:"..." }
const VOTE_QR_ENDPOINT = "/api/venue/vote-qr";

type ApiResp =
  | { ok: true; url: string; expiresAt?: string | null }
  | { ok: false; error: string };

export default function VenueQrVoteBox({ venueId }: { venueId: string }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(VOTE_QR_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ venue_id: venueId }),
      });

      const text = await res.text();
      let json: ApiResp;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Risposta non JSON (endpoint sbagliato o errore server).`);
      }

      if (!json.ok) throw new Error(json.error);

      setUrl(json.url);
      const exp = json.expiresAt ? Date.parse(json.expiresAt) : Date.now() + TTL_SECONDS * 1000;
      setExpiresAt(exp);
    } catch (e: any) {
      setUrl(null);
      setExpiresAt(null);
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  const secondsLeft = useMemo(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      // trigger rerender
      setExpiresAt((x) => (x ? x : null));
    }, 500);
    return () => clearInterval(t);
  }, [expiresAt]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const expired = expiresAt ? Date.now() >= expiresAt : false;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 className="h2" style={{ marginBottom: 6 }}>
            QR Voto (2 min)
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Mostra il QR: l’utente apre la pagina di voto già pronta.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn primary" onClick={generate} disabled={loading}>
            {loading ? "Genero..." : url && !expired ? "Rigenera QR" : "Genera QR voto"}
          </button>
        </div>
      </div>

      {error ? <div className="notice" style={{ marginTop: 10 }}>Errore: {error}</div> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1fr) 280px",
          gap: 12,
          alignItems: "start",
          marginTop: 12,
        }}
      >
        <div className="card soft" style={{ padding: 12 }}>
          <div className="muted">Link voto</div>
          <div style={{ wordBreak: "break-all", marginTop: 6, fontWeight: 700 }}>
            {url ? url : <span className="muted">Genera un QR per ottenere il link.</span>}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={copy} disabled={!url}>
              Copia link
            </button>
            {url ? (
              <a className="btn" href={url} target="_blank" rel="noreferrer">
                Apri
              </a>
            ) : null}

            <span className="badge" style={{ marginLeft: "auto" }}>
              {url ? (expired ? "scaduto" : `scade tra ${mm}:${ss}`) : "—"}
            </span>
          </div>
        </div>

        <div className="card soft" style={{ padding: 12, display: "grid", placeItems: "center" }}>
          {url ? (
            <img
              alt="QR voto"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`}
              style={{ width: 220, height: 220, borderRadius: 12 }}
            />
          ) : (
            <div className="muted" style={{ textAlign: "center" }}>
              QR qui
            </div>
          )}
        </div>
      </div>
    </div>
  );
}