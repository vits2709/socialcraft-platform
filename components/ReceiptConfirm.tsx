"use client";

import { useEffect, useState } from "react";

type Props = { venueId: string };

export default function ReceiptConfirm({ venueId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "pending" | "approved" | "rejected">("idle");
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
        setReason(json?.error || "upload_failed");
        return;
      }

      // se già approvato oggi, chiudi il flusso
      if (json.already_approved) {
        setVerificationId(json.verification_id ?? null);
        setStatus("approved");
        setPoints(10);
        return;
      }

      setVerificationId(json.verification_id);
      setStatus("pending");
    } catch (e: any) {
      setStatus("idle");
      setReason(e?.message || "upload_failed");
    }
  }

  function reset() {
    setFile(null);
    setVerificationId(null);
    setStatus("idle");
    setReason(null);
    setPoints(null);
  }

  // polling process quando pending
  useEffect(() => {
    if (status !== "pending" || !verificationId) return;

    let alive = true;

    async function run() {
      try {
        const res = await fetch(`/api/receipt/process?id=${verificationId}`, { method: "POST" });
        const json = await res.json().catch(() => null);

        if (!alive) return;

        if (!res.ok || !json?.ok) {
          setReason(json?.error || "process_failed");
          // rimani pending ma NON restare appeso: riprova
          setTimeout(run, 1500);
          return;
        }

        if (json.status === "approved") {
          setStatus("approved");
          setPoints(json.points ?? 10);
          setReason(null);
          return;
        }

        if (json.status === "rejected") {
          setStatus("rejected");
          setReason(json.reason || "rejected");
          return;
        }

        // ancora pending -> riprova
        setTimeout(run, 1500);
      } catch (e: any) {
        if (!alive) return;
        setReason(e?.message || "process_failed");
        setTimeout(run, 1500);
      }
    }

    const t = setTimeout(run, 600);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [status, verificationId]);

  const isBusy = status === "uploading" || status === "pending";

  return (
    <div className="card" style={{ padding: 16, marginTop: 12 }}>
      <h2 className="h2" style={{ marginTop: 0 }}>
        Conferma consumazione (+10)
      </h2>

      <p className="muted" style={{ marginTop: 6 }}>
        Carica una foto dello scontrino: verrà messo <b>in revisione</b> e validato automaticamente.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={isBusy}
        />

        <button className="btn" onClick={upload} disabled={!file || isBusy}>
          {status === "uploading" ? "Caricamento…" : status === "pending" ? "Verifica…" : "Carica scontrino"}
        </button>

        <button className="btn" onClick={reset} disabled={status === "uploading"}>
          Reset
        </button>

        {status === "approved" ? <span className="badge">✅ Approvato +{points ?? 10}</span> : null}
        {status === "rejected" ? <span className="badge">❌ Rifiutato</span> : null}
      </div>

      {reason ? (
        <div className="notice" style={{ marginTop: 10 }}>
          <b>Errore:</b> {reason}
        </div>
      ) : null}
    </div>
  );
}