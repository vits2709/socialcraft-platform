"use client";

import { useState } from "react";

type RedeemResult = {
  prize_description: string;
  winner_name: string | null;
  week_start: string;
};

export default function RedeemCodeForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: true; data: RedeemResult } | { ok: false; error: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/prizes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        const msgs: Record<string, string> = {
          code_not_found: "Codice non trovato.",
          already_redeemed: "Questo codice è già stato riscattato.",
          code_expired: "Codice scaduto.",
          no_venue: "Nessuno spot associato al tuo account.",
          code_not_for_this_venue: "Questo codice non appartiene al tuo spot.",
          unauthorized: "Non sei autorizzato.",
        };
        setResult({ ok: false, error: msgs[json.error] ?? (json.error ?? "Errore sconosciuto") });
      } else {
        setResult({ ok: true, data: json });
        setCode("");
      }
    } catch (err: any) {
      setResult({ ok: false, error: err?.message ?? "Errore di rete" });
    }

    setLoading(false);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Il vincitore del premio settimanale riceve un codice univoco. Inseriscilo qui per validare il riscatto.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="CQ-2607-AB3K"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={16}
          style={{
            fontFamily: "monospace",
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: 2,
            padding: "10px 16px",
            borderRadius: 12,
            border: "1.5px solid rgba(0,0,0,0.15)",
            background: "white",
            textTransform: "uppercase",
            minWidth: 180,
            flex: 1,
          }}
        />
        <button
          type="submit"
          className="btn primary"
          disabled={loading || !code.trim()}
        >
          {loading ? "Verifico..." : "Valida codice"}
        </button>
      </form>

      {result && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            border: result.ok
              ? "1.5px solid rgba(16,185,129,0.35)"
              : "1.5px solid rgba(239,68,68,0.35)",
            background: result.ok
              ? "rgba(16,185,129,0.06)"
              : "rgba(239,68,68,0.06)",
            display: "grid",
            gap: 6,
          }}
        >
          {result.ok ? (
            <>
              <div style={{ fontWeight: 900, fontSize: 16, color: "#059669" }}>
                ✅ Premio riscattato con successo!
              </div>
              <div style={{ fontSize: 14 }}>
                <b>Vincitore:</b> {result.data.winner_name ?? "Esploratore"}
              </div>
              <div style={{ fontSize: 14 }}>
                <b>Premio:</b> {result.data.prize_description}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Settimana del {new Date(result.data.week_start + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </>
          ) : (
            <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 14 }}>
              ❌ {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
