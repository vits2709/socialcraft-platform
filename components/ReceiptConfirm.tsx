"use client";

import { useEffect, useState } from "react";

type Props = { venueId: string };

type Status = "idle" | "uploading" | "analyzing" | "pending" | "approved" | "rejected" | "manual_review";

export default function ReceiptConfirm({ venueId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);

  async function upload() {
    if (!file) return;

    setStatus("uploading");
    setReason(null);
    setPoints(null);

    try {
      const fd = new FormData();
      fd.append("venue_id", venueId);
      fd.append("file", file);

      const res = await fetch("/api/receipt/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setStatus("idle");
        setReason(json?.error || "Errore upload");
        return;
      }

      if (json.already_approved) {
        setVerificationId(json.verification_id ?? null);
        setStatus("approved");
        setPoints(null);
        return;
      }

      setVerificationId(json.verification_id);
      setStatus("analyzing"); // prima analisi AI, poi pending se attesa manuale
    } catch (e: any) {
      setStatus("idle");
      setReason(e?.message || "Errore di rete");
    }
  }

  function reset() {
    setFile(null);
    setVerificationId(null);
    setStatus("idle");
    setReason(null);
    setPoints(null);
  }

  // Polling: parte su "analyzing" o "pending"
  useEffect(() => {
    const isPolling = status === "analyzing" || status === "pending";
    if (!isPolling || !verificationId) return;

    let alive = true;

    async function run() {
      try {
        const res = await fetch(`/api/receipt/process?id=${verificationId}`, { method: "POST" });
        const json = await res.json().catch(() => null);

        if (!alive) return;

        if (!res.ok || !json?.ok) {
          setTimeout(run, 2000);
          return;
        }

        if (json.status === "approved") {
          setStatus("approved");
          setPoints(json.points_awarded ?? null);
          setReason(null);
          return;
        }

        if (json.status === "rejected") {
          setStatus("rejected");
          setReason(json.reason || "Scontrino non valido");
          return;
        }

        if (json.status === "manual_review") {
          setStatus("manual_review");
          return;
        }

        // ancora pending/analyzing → riprova
        if (status === "analyzing") setStatus("pending");
        setTimeout(run, 1500);
      } catch (e: any) {
        if (!alive) return;
        setTimeout(run, 2000);
      }
    }

    const t = setTimeout(run, 800);
    return () => { alive = false; clearTimeout(t); };
  }, [status, verificationId]);

  const isBusy = status === "uploading" || status === "analyzing" || status === "pending";

  function buttonLabel() {
    if (status === "uploading") return "📤 Caricamento in corso...";
    if (status === "analyzing") return "🤖 Analisi scontrino in corso...";
    if (status === "pending")   return "⏳ Verifica in corso...";
    return "Carica scontrino";
  }

  return (
    <div className="card" style={{ padding: 16, marginTop: 12 }}>
      <h2 className="h2" style={{ marginTop: 0 }}>
        Conferma consumazione
      </h2>

      <p className="muted" style={{ marginTop: 6 }}>
        Carica una foto dello scontrino: viene analizzato automaticamente dall&apos;AI.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={isBusy}
        />

        <button className="btn" onClick={upload} disabled={!file || isBusy}>
          {buttonLabel()}
        </button>

        <button className="btn" onClick={reset} disabled={status === "uploading"}>
          Reset
        </button>
      </div>

      {/* Stato */}
      {status === "approved" && (
        <div className="notice" style={{ marginTop: 10, background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)" }}>
          {points !== null && points > 0
            ? `✅ Scontrino approvato! Hai guadagnato +${points} punti`
            : "✅ Scontrino approvato!"}
        </div>
      )}

      {status === "manual_review" && (
        <div className="notice" style={{ marginTop: 10, background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)" }}>
          ⏳ Scontrino in revisione manuale — riceverai i punti entro 24 ore
        </div>
      )}

      {status === "rejected" && (
        <div className="notice" style={{ marginTop: 10, background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)" }}>
          ❌ {reason ?? "Scontrino non valido"} — Riprova con una foto più nitida
        </div>
      )}

      {status === "idle" && reason && (
        <div className="notice" style={{ marginTop: 10 }}>
          <b>Errore:</b> {reason}
        </div>
      )}
    </div>
  );
}
