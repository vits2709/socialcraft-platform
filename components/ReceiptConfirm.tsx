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

    setVerificationId(json.verification_id);
    setStatus("pending");
  }

  // polling: quando pending, chiama process
  useEffect(() => {
    if (status !== "pending" || !verificationId) return;

    let alive = true;

    async function run() {
      const res = await fetch(`/api/receipt/process?id=${verificationId}`, { method: "POST" });
      const json = await res.json().catch(() => null);

      if (!alive) return;

      if (!res.ok || !json?.ok) {
        setReason(json?.error || "process_failed");
        // resta pending ma mostra errore
        return;
      }

      if (json.status === "approved") {
        setStatus("approved");
        setPoints(json.points ?? 10);
        setReason(null);
      } else if (json.status === "rejected") {
        setStatus("rejected");
        setReason(json.reason || "rejected");
      } else {
        // se ancora pending, riprova tra poco
        setTimeout(run, 1500);
      }
    }

    const t = setTimeout(run, 700);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [status, verificationId]);

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
          disabled={status === "uploading" || status === "pending"}
        />
        <button className="btn" onClick={upload} disabled={!file || status === "uploading" || status === "pending"}>
          {status === "uploading" ? "Caricamento…" : status === "pending" ? "In revisione…" : "Invia"}
        </button>

        {status === "approved" ? <span className="badge">✅ Approvato +{points ?? 10}</span> : null}
        {status === "rejected" ? <span className="badge">❌ Rifiutato</span> : null}
      </div>

      {reason ? (
        <div className="notice" style={{ marginTop: 10 }}>
          <b>Nota:</b> {reason}
        </div>
      ) : null}
    </div>
  );
}