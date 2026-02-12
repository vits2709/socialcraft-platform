"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  venueId: string;
  slug: string;
};

type Step = "idle" | "scanned" | "uploaded" | "approved" | "rejected" | "rated";

type ProcessResp =
  | { ok: false; error: string }
  | { ok: true; status: "pending" | "approved" | "rejected"; reason?: string | null };

function isAlreadyVisitedMessage(s: unknown) {
  const t = String(s ?? "").toLowerCase();
  return (
    t.includes("already") ||
    t.includes("today") ||
    t.includes("duplicate") ||
    t.includes("già") ||
    t.includes("gia") ||
    t.includes("giorno")
  );
}

function getQrContext() {
  if (typeof window === "undefined") return { isQr: false, qrKey: null as string | null };
  const u = new URL(window.location.href);
  const qrKey = (u.searchParams.get("k") ?? "").trim() || null;
  return { isQr: Boolean(qrKey), qrKey };
}

export default function VisitFlow({ venueId, slug }: Props) {
  const storageKey = useMemo(() => `sc_visit_${venueId}`, [venueId]);

  const [step, setStep] = useState<Step>("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingRate, setLoadingRate] = useState(false);

  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);

  const [isQr, setIsQr] = useState(false);
  const [qrKey, setQrKey] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  // restore state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.step) setStep(parsed.step);
      if (parsed.verificationId) setVerificationId(parsed.verificationId);
      if (typeof parsed.rating === "number") setRating(parsed.rating);
    } catch {}
  }, [storageKey]);

  // detect QR
  useEffect(() => {
    const ctx = getQrContext();
    setIsQr(ctx.isQr);
    setQrKey(ctx.qrKey);
  }, []);

  function persist(next: Partial<{ step: Step; verificationId: string | null; rating: number }>) {
    const payload = {
      step: next.step ?? step,
      verificationId: next.verificationId ?? verificationId,
      rating: next.rating ?? rating,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  function resetFlow() {
    localStorage.removeItem(storageKey);
    setStep("idle");
    setVerificationId(null);
    setRating(0);
    setMsg(null);
  }

  // SCAN
  async function handleScan(silent = false) {
    setLoadingScan(true);
    if (!silent) setMsg(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, k: qrKey }),
      });

      const data = await res.json();

      if (!data?.ok) {
        if (isAlreadyVisitedMessage(data?.error)) {
          setStep("scanned");
          persist({ step: "scanned" });
          if (!silent) setMsg("Presenza già registrata oggi.");
        } else {
          if (!silent) setMsg("Errore: " + data?.error);
        }
      } else {
        setStep("scanned");
        persist({ step: "scanned" });
        if (!silent) setMsg(data?.message ?? "Presenza registrata");
      }
    } catch {
      if (!silent) setMsg("Errore di rete");
    }

    setLoadingScan(false);
  }

  // auto scan da QR
  useEffect(() => {
    if (step === "idle" && isQr) {
      handleScan(true);
    }
  }, [isQr, step]);

  // UPLOAD
  async function uploadReceipt(file: File) {
    if (step === "idle") {
      setMsg("Prima registra la presenza.");
      return;
    }

    setLoadingUpload(true);
    setMsg(null);

    try {
      const fd = new FormData();
      fd.append("venue_id", venueId);
      fd.append("file", file);

      const res = await fetch("/api/receipt/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!data?.ok) {
        setMsg("Errore: " + (data?.error ?? "upload_failed"));
      } else {
        setVerificationId(data.verification_id);
        setStep("uploaded");
        persist({ step: "uploaded", verificationId: data.verification_id });
        setMsg("Scontrino caricato. In attesa approvazione.");
      }
    } catch {
      setMsg("Errore di rete upload");
    }

    setLoadingUpload(false);
  }

  async function handlePickedFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!f) return;
    await uploadReceipt(f);
  }

  // STATUS
  async function refreshStatus() {
    if (!verificationId) return;

    setLoadingStatus(true);

    try {
      const res = await fetch(`/api/receipt/process?id=${verificationId}`, {
        method: "POST",
      });

      const data: ProcessResp = await res.json();

      if (data.ok && data.status === "approved") {
        setStep("approved");
        persist({ step: "approved" });
        setMsg("Scontrino approvato.");
      }
    } catch {}

    setLoadingStatus(false);
  }

  // RATING
  async function handleRateSubmit() {
    if (step !== "approved") return;

    setLoadingRate(true);

    try {
      await fetch("/api/rate/submit", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ venue_id: venueId, rating }),
      });

      setStep("rated");
      persist({ step: "rated", rating });
      setMsg("Voto registrato");
    } catch {}

    setLoadingRate(false);
  }

  const canUpload = step !== "idle";
  const canRate = step === "approved";

  return (
    <div style={{ display: "grid", gap: 14 }}>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePickedFile}/>
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePickedFile}/>

      {step === "idle" && (
        <div className="notice">
          <button className="btn primary" onClick={() => handleScan()}>
            {loadingScan ? "Registrazione..." : "Registra presenza (+2)"}
          </button>
        </div>
      )}

      {canUpload && (
        <div className="notice">
          <button className="btn primary" onClick={() => cameraRef.current?.click()}>
            📸 Scatta scontrino
          </button>

          <button className="btn" onClick={() => galleryRef.current?.click()}>
            Carica da galleria
          </button>

          {verificationId && (
            <button className="btn" onClick={refreshStatus}>
              Aggiorna stato
            </button>
          )}
        </div>
      )}

      {canRate && (
        <div className="notice">
          <button className="btn" onClick={handleRateSubmit}>
            Invia voto
          </button>
        </div>
      )}

      {msg && <div className="notice">{msg}</div>}
    </div>
  );
}