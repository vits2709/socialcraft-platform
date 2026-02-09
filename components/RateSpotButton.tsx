"use client";

import { useMemo, useState } from "react";

type Props = {
  venueId: string;
  spotName?: string;
  disabled?: boolean;
  className?: string;
};

export default function RateSpotButton({ venueId, spotName, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const stars = useMemo(() => [1, 2, 3, 4, 5], []);

  async function submit() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/rate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: venueId, rating }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const err = data?.error || "rate_failed";
        if (err === "not_allowed_today") setMsg("Puoi votare solo dopo una consumazione approvata oggi.");
        else if (err === "already_rated_today") setMsg("Hai già votato questo Spot oggi 🙌");
        else setMsg(`Errore: ${err}`);
        setLoading(false);
        return;
      }

      setMsg("Voto salvato! 🔥");
      setTimeout(() => {
        setOpen(false);
        setMsg(null);
      }, 650);
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "network_error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={className ?? "btn"}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        ⭐ Dai un voto
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => (loading ? null : setOpen(false))}
        >
          <div
            className="card"
            style={{
              width: "min(520px, 100%)",
              borderRadius: 16,
              boxShadow: "0 18px 60px rgba(0,0,0,.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div className="muted" style={{ fontSize: 13 }}>Voto (facoltativo)</div>
                <h2 className="h1" style={{ fontSize: 22, margin: 0 }}>
                  {spotName ? `Com’è stato ${spotName}?` : "Com’è stato lo Spot?"}
                </h2>
              </div>

              <button className="btn" type="button" onClick={() => (loading ? null : setOpen(false))}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="muted" style={{ marginBottom: 8 }}>Seleziona da 1 a 5</div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {stars.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={s <= rating ? "btn primary" : "btn"}
                    onClick={() => setRating(s)}
                    disabled={loading}
                    style={{ borderRadius: 999 }}
                  >
                    {"★".repeat(s)}
                  </button>
                ))}
              </div>

              {msg ? (
                <div className="notice" style={{ marginTop: 12 }}>
                  {msg}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                <button className="btn" type="button" onClick={() => setOpen(false)} disabled={loading}>
                  Annulla
                </button>
                <button className="btn primary" type="button" onClick={submit} disabled={loading}>
                  {loading ? "Salvo..." : "Salva voto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}