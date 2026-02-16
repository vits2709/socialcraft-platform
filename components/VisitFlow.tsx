"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = { venueId: string; slug: string };
type Step = "idle" | "scanned" | "uploaded" | "approved" | "rejected" | "rated";

type ProcessResp =
  | { ok: false; error: string }
  | { ok: true; status: "pending" | "approved" | "rejected"; reason?: string | null; points_awarded?: number; total_points?: number };

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

  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { step?: Step; verificationId?: string | null; rating?: number };
      if (parsed.step) setStep(parsed.step);
      if (parsed.verificationId) setVerificationId(parsed.verificationId);
      if (typeof parsed.rating === "number") setRating(parsed.rating);
    } catch {}
  }, [storageKey]);

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

  async function handleScan() {
    setLoadingScan(true);
    setMsg(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();

      if (!data?.ok) {
        setMsg("Errore: " + (data?.error ?? "scan_failed"));
      } else {
        setStep("scanned");
        persist({ step: "scanned" });
        const pts = Number(data?.points_awarded ?? 2);
        setMsg(data?.message ?? `Presenza registrata ✅ +${pts} punti`);
      }
    } catch {
      setMsg("Errore di rete (scan)");
    }
    setLoadingScan(false);
  }

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

      const res = await fetch("/api/receipt/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!data?.ok) {
        setMsg("Errore: " + (data?.error ?? "upload_failed"));
      } else {
        const vid = String(data?.verification_id ?? "").trim();
        if (!vid) {
          setMsg("Errore: verification_id mancante.");
        } else {
          setVerificationId(vid);
          setStep("uploaded");
          persist({ step: "uploaded", verificationId: vid });
          setMsg(data?.duplicate ? "Scontrino già caricato ✅ (riprendo la verifica)" : "Scontrino caricato ✅ Ora è in revisione.");
        }
      }
    } catch {
      setMsg("Errore di rete (upload)");
    }

    setLoadingUpload(false);
  }

  async function handlePickedFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.currentTarget.value = "";
    if (!f) return;
    await uploadReceipt(f);
  }

  async function refreshStatus(silent = false) {
    if (!verificationId) {
      if (!silent) setMsg("Manca verification_id.");
      return;
    }

    setLoadingStatus(true);
    if (!silent) setMsg(null);

    try {
      const res = await fetch(`/api/receipt/process?id=${encodeURIComponent(verificationId)}`, { method: "POST" });
      const data: ProcessResp = await res.json();

      if (!data?.ok) {
        if (!silent) setMsg("Errore: " + (data?.error ?? "process_failed"));
      } else if (data.status === "approved") {
        setStep("approved");
        persist({ step: "approved" });
        const awarded = Number(data.points_awarded ?? 0);
        if (!silent) setMsg(awarded > 0 ? `Consumazione approvata ✅ +${awarded} punti` : "Consumazione approvata ✅");
      } else if (data.status === "rejected") {
        setStep("rejected");
        persist({ step: "rejected" });
        if (!silent) setMsg(`Scontrino rifiutato ❌${data.reason ? ` (${data.reason})` : ""}`);
      } else {
        if (!silent) setMsg("Ancora in revisione ⏳");
      }
    } catch {
      if (!silent) setMsg("Errore di rete (status)");
    }

    setLoadingStatus(false);
  }

  useEffect(() => {
    if (step !== "uploaded") return;
    if (!verificationId) return;
    const t = setInterval(() => refreshStatus(true), 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, verificationId]);

  async function handleRateSubmit() {
    if (step !== "approved") {
      setMsg("Il voto si sblocca dopo approvazione.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setMsg("Scegli un voto da 1 a 5.");
      return;
    }

    setLoadingRate(true);
    setMsg(null);

    try {
      const res = await fetch("/api/rate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: venueId, rating }),
      });

      const data = await res.json();
      if (!data?.ok) {
        setMsg("Errore: " + (data?.error ?? "rate_failed"));
      } else {
        setStep("rated");
        persist({ step: "rated", rating });
        setMsg("Voto registrato ✅ (0 punti)");
      }
    } catch {
      setMsg("Errore di rete (rating)");
    }

    setLoadingRate(false);
  }

  const canUpload = step !== "idle";
  const canCheck = Boolean(verificationId) && step === "uploaded";
  const canRate = step === "approved";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePickedFile} disabled={!canUpload || loadingUpload} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePickedFile} disabled={!canUpload || loadingUpload} />

      {/* STEP 1 */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>1) Presenza (+2)</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.35 }}>
              Registra la presenza allo Spot. <b>1 volta al giorno</b>.
            </div>
          </div>
          <span className="badge" title="Step 1">
            <span className="dot" /> {step === "idle" ? "da fare" : "ok"}
          </span>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={handleScan} disabled={loadingScan}>
            {loadingScan ? "Registrazione..." : "Registra presenza (+2)"}
          </button>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>2) Scontrino (+8)</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.35 }}>
              Carica la foto dello scontrino: va in revisione manuale. Quando l’admin approva ricevi <b>+8 punti</b>.
            </div>
          </div>
          <span className="badge" title="Step 2">
            <span className="dot" />{" "}
            {step === "uploaded" ? "in revisione" : step === "approved" ? "approvato" : step === "rejected" ? "rifiutato" : canUpload ? "pronto" : "bloccato"}
          </span>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn primary" type="button" disabled={!canUpload || loadingUpload} onClick={() => cameraRef.current?.click()}>
              {loadingUpload ? "Caricamento..." : "📸 Scatta scontrino (+8)"}
            </button>
            <button className="btn" type="button" disabled={!canUpload || loadingUpload} onClick={() => galleryRef.current?.click()}>
              Carica da galleria
            </button>
            <button className="btn" onClick={resetFlow} type="button">
              Reset
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn" onClick={() => refreshStatus(false)} disabled={loadingStatus || !canCheck}>
              {loadingStatus ? "Aggiorno..." : "Aggiorna stato"}
            </button>

            {verificationId ? (
              <div className="muted">
                ID verifica: <b>{verificationId}</b>
              </div>
            ) : (
              <div className="muted">Dopo il caricamento vedrai qui l’ID della verifica.</div>
            )}
          </div>

          {!canUpload ? <div className="muted">⚠️ Prima registra la <b>presenza</b>, poi puoi caricare lo scontrino.</div> : null}
        </div>
      </div>

      {/* STEP 3 */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>3) Voto (facoltativo)</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.35 }}>
              Dopo approvazione puoi lasciare un voto da 1 a 5. <b>(0 punti)</b>
            </div>
          </div>

          <span className="badge" title="Step 3">
            <span className="dot" /> {step === "rated" ? "votato" : canRate ? "sbloccato" : "bloccato"}
          </span>
        </div>

        <div style={{ marginTop: 12 }}>
          <StarPicker value={rating} onChange={(v) => setRating(v)} disabled={!canRate} />
          <button className="btn" onClick={handleRateSubmit} disabled={loadingRate || !canRate}>
            {loadingRate ? "Invio..." : "Invia voto"}
          </button>

          {!canRate ? (
            <div className="muted" style={{ marginTop: 10 }}>
              (Si sblocca solo quando lo scontrino viene <b>approvato</b>)
            </div>
          ) : null}
        </div>
      </div>

      {msg ? (
        <div className="notice" style={{ padding: 14 }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="btn"
          onClick={() => onChange(n)}
          disabled={disabled}
          style={{ padding: "10px 12px", opacity: disabled ? 0.55 : 1, transform: value === n ? "scale(1.03)" : "none" }}
          title={`${n} stelle`}
        >
          {n <= value ? "⭐" : "☆"}
        </button>
      ))}
      <span className="muted" style={{ marginLeft: 6 }}>
        {value ? `${value}/5` : "Seleziona"}
      </span>
    </div>
  );
}