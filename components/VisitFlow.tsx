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

export default function VisitFlow({ venueId, slug }: Props) {
  const storageKey = useMemo(() => `sc_visit_${venueId}`, [venueId]);

  const [step, setStep] = useState<Step>("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingRate, setLoadingRate] = useState(false);

  const [verificationId, setVerificationId] = useState<string | null>(null);

  // rating (facoltativo, 0 punti)
  const [rating, setRating] = useState<number>(0);

  // input refs (camera / gallery)
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  // Restore state (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        step?: Step;
        verificationId?: string | null;
        rating?: number;
      };
      if (parsed.step) setStep(parsed.step);
      if (parsed.verificationId) setVerificationId(parsed.verificationId);
      if (typeof parsed.rating === "number") setRating(parsed.rating);
    } catch {
      // ignore
    }
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

  // STEP 1: Scan
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
        // ✅ sia scan nuovo che already=true sbloccano step 2
        setStep("scanned");
        persist({ step: "scanned" });

        const pts = Number(data?.points ?? 0);
        const text = String(data?.message ?? "").trim();

        if (text) setMsg(text);
        else setMsg(pts > 0 ? `Presenza registrata ✅ +${pts} punti` : "Presenza ok ✅ Ora carica lo scontrino.");
      }
    } catch {
      setMsg("Errore di rete (scan)");
    }

    setLoadingScan(false);
  }

  // STEP 2: Upload receipt
  async function uploadReceipt(file: File) {
    if (step === "idle") {
      setMsg("Prima registra la presenza (Step 1).");
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
        const vid = String(data?.verification_id ?? "").trim();
        if (!vid) {
          setMsg("Errore: verification_id mancante.");
        } else {
          setVerificationId(vid);
          setStep("uploaded");
          persist({ step: "uploaded", verificationId: vid });
          setMsg("Scontrino caricato ✅ Ora è in revisione (manuale).");
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

  // STEP 3: Check status (process)
  async function refreshStatus(silent = false) {
    if (!verificationId) {
      if (!silent) setMsg("Manca verification_id.");
      return;
    }

    setLoadingStatus(true);
    if (!silent) setMsg(null);

    try {
      const res = await fetch(`/api/receipt/process?id=${encodeURIComponent(verificationId)}`, {
        method: "POST",
      });

      const data: ProcessResp = await res.json();

      if (!data?.ok) {
        if (!silent) setMsg("Errore: " + (data?.error ?? "process_failed"));
      } else if (data.status === "approved") {
        setStep("approved");
        persist({ step: "approved" });
        if (!silent) setMsg("Consumazione approvata ✅ +8 punti assegnati. Ora puoi votare (facoltativo).");
      } else if (data.status === "rejected") {
        setStep("rejected");
        persist({ step: "rejected" });
        if (!silent) setMsg(`Scontrino rifiutato ❌${data.reason ? ` (${data.reason})` : ""}`);
      } else {
        if (!silent) setMsg("Ancora in revisione ⏳ (admin deve approvare)");
      }
    } catch {
      if (!silent) setMsg("Errore di rete (status)");
    }

    setLoadingStatus(false);
  }

  // auto-poll mentre pending
  useEffect(() => {
    if (step !== "uploaded") return;
    if (!verificationId) return;

    const t = setInterval(() => {
      refreshStatus(true);
    }, 6000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, verificationId]);

  // STEP 4: Rating (facoltativo, 0 punti)
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
        setMsg("Voto registrato ✅ (0 punti, serve per il rating)");
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
      {/* hidden inputs (camera + gallery) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handlePickedFile}
        disabled={!canUpload || loadingUpload}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePickedFile}
        disabled={!canUpload || loadingUpload}
      />

      {/* STEP 1 */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>1) Presenza (+2)</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.35 }}>
              Registra la presenza allo Spot. (1 volta al giorno)
            </div>
          </div>

          <span className="badge" title="Step 1">
            <span className="dot" /> {step === "idle" ? "da fare" : "ok"}
          </span>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn primary" onClick={handleScan} disabled={loadingScan}>
            {loadingScan ? "Registrazione..." : "Registra presenza (+2)"}
          </button>
          <button className="btn" onClick={resetFlow} type="button">
            Reset
          </button>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>2) Scontrino (+8)</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.35 }}>
              Scatta la foto dello scontrino: va in revisione manuale. Quando l’admin approva ricevi <b>+8 punti</b>.
            </div>
          </div>

          <span className="badge" title="Step 2">
            <span className="dot" />{" "}
            {step === "uploaded"
              ? "in revisione"
              : step === "approved"
              ? "approvato"
              : step === "rejected"
              ? "rifiutato"
              : canUpload
              ? "pronto"
              : "bloccato"}
          </span>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn primary"
              type="button"
              disabled={!canUpload || loadingUpload}
              onClick={() => cameraRef.current?.click()}
            >
              {loadingUpload ? "Caricamento..." : "📸 Scatta scontrino (+8)"}
            </button>

            <button
              className="btn"
              type="button"
              disabled={!canUpload || loadingUpload}
              onClick={() => galleryRef.current?.click()}
            >
              Carica da galleria
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

          {!canUpload ? (
            <div className="muted">
              ⚠️ Prima fai <b>Presenza</b> (Step 1), poi puoi caricare lo scontrino.
            </div>
          ) : null}
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
          <StarPicker
            value={rating}
            onChange={(v) => {
              setRating(v);
              persist({ rating: v });
            }}
            disabled={!canRate}
          />

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

      {/* MSG */}
      {msg ? (
        <div className="notice" style={{ padding: 14 }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="btn"
          onClick={() => onChange(n)}
          disabled={disabled}
          style={{
            padding: "10px 12px",
            opacity: disabled ? 0.55 : 1,
            transform: value === n ? "scale(1.03)" : "none",
          }}
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