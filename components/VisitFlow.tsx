"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [file, setFile] = useState<File | null>(null);

  // rating (facoltativo, 0 punti)
  const [rating, setRating] = useState<number>(0);

  // -----------------------------
  // Restore state (localStorage)
  // -----------------------------
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
    setFile(null);
    setRating(0);
    setMsg(null);
  }

  // -----------------------------
  // STEP 1: Scan
  // -----------------------------
  async function handleScan() {
    setLoadingScan(true);
    setMsg(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }), // ✅ logica esistente: scan via slug
      });

      const data = await res.json();

      if (!data?.ok) {
        setMsg("Errore: " + (data?.error ?? "scan_failed"));
      } else {
        const pts = Number(data?.points ?? 2);
        setMsg(`Visita registrata ✅ +${pts} punti`);
        setStep("scanned");
        persist({ step: "scanned" });
      }
    } catch {
      setMsg("Errore di rete (scan)");
    }

    setLoadingScan(false);
  }

  // -----------------------------
  // STEP 2: Upload receipt
  // -----------------------------
  async function handleUpload() {
    if (step === "idle") {
      setMsg("Prima registra la visita (Step 1).");
      return;
    }
    if (!file) {
      setMsg("Seleziona prima una foto dello scontrino.");
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

  // -----------------------------
  // STEP 3: Check status (process)
  // -----------------------------
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
        if (!silent) setMsg("Consumazione approvata ✅ +8 punti assegnati (da admin). Ora puoi votare (facoltativo).");
      } else if (data.status === "rejected") {
        setStep("rejected");
        persist({ step: "rejected" });
        if (!silent) setMsg(`Scontrino rifiutato ❌${data.reason ? ` (${data.reason})` : ""}`);
      } else {
        // pending
        if (!silent) setMsg("Ancora in revisione ⏳ (admin deve approvare)");
      }
    } catch {
      if (!silent) setMsg("Errore di rete (status)");
    }

    setLoadingStatus(false);
  }

  // auto-poll leggero mentre pending (solo se uploaded e non approved/rejected)
  useEffect(() => {
    if (step !== "uploaded") return;
    if (!verificationId) return;

    const t = setInterval(() => {
      // silent refresh: non spammiamo messaggi
      refreshStatus(true);
    }, 6000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, verificationId]);

  // -----------------------------
  // STEP 4: Rating (facoltativo)
  // -----------------------------
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

  // -----------------------------
  // UI helpers
  // -----------------------------
  const canUpload = step !== "idle";
  const canCheck = Boolean(verificationId) && (step === "uploaded");
  const canRate = step === "approved";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* STEP 1 */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>1) Registra visita</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.35 }}>
              Premi per registrare la visita allo Spot. (Punti base: <b>+2</b>)
            </div>
          </div>

          <span className="badge" title="Step 1">
            <span className="dot" /> {step === "idle" ? "da fare" : "ok"}
          </span>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={handleScan} disabled={loadingScan}>
            {loadingScan ? "Registrazione..." : "Registra visita (+2)"}
          </button>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>2) Carica scontrino (consumazione)</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.35 }}>
              Carica la foto dello scontrino. Va in revisione manuale: quando l’admin approva ricevi <b>+8 punti</b>.
            </div>
          </div>

          <span className="badge" title="Step 2">
            <span className="dot" />{" "}
            {step === "uploaded" ? "in revisione" : step === "approved" ? "approvato" : step === "rejected" ? "rifiutato" : "—"}
          </span>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={!canUpload}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={handleUpload} disabled={loadingUpload || !canUpload}>
              {loadingUpload ? "Caricamento..." : "Carica scontrino"}
            </button>

            {/* NIENTE “Verifica consumazione” */}
            <button className="btn" onClick={() => refreshStatus(false)} disabled={loadingStatus || !canCheck}>
              {loadingStatus ? "Aggiorno..." : "Aggiorna stato"}
            </button>

            <button className="btn" onClick={resetFlow} type="button">
              Reset
            </button>
          </div>

          {verificationId ? (
            <div className="muted" style={{ marginTop: 2 }}>
              ID verifica: <b>{verificationId}</b>
            </div>
          ) : null}
        </div>
      </div>

      {/* STEP 3 */}
      <div className="notice" style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>3) Vota lo Spot (facoltativo)</div>
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