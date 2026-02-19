"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type GeoState = "idle" | "requesting" | "verified" | "denied" | "too_far" | "unavailable";
type CheckinStatus = "idle" | "geo_checking" | "scanning" | "success" | "already" | "too_far" | "error";
type ReceiptStatus = "idle" | "uploading" | "polling" | "approved" | "rejected" | "skipped";
type VoteStatus = "ready" | "submitting" | "done" | "skipped" | "cooldown";
type FlowPhase = "checkin" | "receipt" | "vote" | "done";

type Props = {
  slug: string;
  venueId: string;
  venueName: string;
  spotLat: number | null;
  spotLng: number | null;
  // Preloaded server-side
  initialReceiptId: string | null;
  initialReceiptStatus: "pending" | "approved" | "rejected" | null;
  hasVotedRecently: boolean;
  nextVoteAt: string | null;
};

// ── Haversine ─────────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GEO_RADIUS_M = 100;

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ phase }: { phase: FlowPhase }) {
  const steps: { id: FlowPhase; label: string }[] = [
    { id: "checkin", label: "Check-in" },
    { id: "receipt", label: "Scontrino" },
    { id: "vote", label: "Voto" },
  ];
  const order: FlowPhase[] = ["checkin", "receipt", "vote", "done"];
  const currentIdx = order.indexOf(phase);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", marginBottom: 28 }}>
      {steps.map((s, i) => {
        const stepIdx = order.indexOf(s.id);
        const isDone = currentIdx > stepIdx;
        const isActive = currentIdx === stepIdx;
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 15,
                  background: isDone
                    ? "rgba(16,185,129,0.15)"
                    : isActive
                    ? "#6366f1"
                    : "rgba(0,0,0,0.06)",
                  color: isDone ? "#059669" : isActive ? "#fff" : "rgba(0,0,0,0.25)",
                  border: `2px solid ${isDone ? "rgba(16,185,129,0.35)" : isActive ? "#6366f1" : "rgba(0,0,0,0.1)"}`,
                  transition: "all 250ms",
                }}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#6366f1" : isDone ? "#059669" : "rgba(0,0,0,0.35)",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 52,
                  height: 2,
                  margin: "0 6px",
                  marginBottom: 18,
                  background: currentIdx > stepIdx + 1
                    ? "rgba(16,185,129,0.35)"
                    : currentIdx > stepIdx
                    ? "rgba(99,102,241,0.35)"
                    : "rgba(0,0,0,0.08)",
                  transition: "all 250ms",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Star Picker ───────────────────────────────────────────────────────────────

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
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          disabled={disabled}
          style={{
            fontSize: 40,
            background: "none",
            border: "none",
            padding: "4px",
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.4 : 1,
            transform: value >= n ? "scale(1.15)" : "scale(1)",
            transition: "transform 120ms",
            lineHeight: 1,
          }}
        >
          {n <= value ? "⭐" : "☆"}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CheckinClient({
  slug,
  venueId,
  venueName,
  spotLat,
  spotLng,
  initialReceiptId,
  initialReceiptStatus,
  hasVotedRecently,
  nextVoteAt,
}: Props) {
  // ── Flow phase
  const [phase, setPhase] = useState<FlowPhase>("checkin");

  // ── Step 1 — Check-in
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus>("idle");
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [checkinPoints, setCheckinPoints] = useState(0);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  // ── Step 2 — Scontrino
  const initReceiptStatus = (): ReceiptStatus => {
    if (!initialReceiptId) return "idle";
    if (initialReceiptStatus === "approved") return "approved";
    if (initialReceiptStatus === "rejected") return "rejected";
    return "polling";
  };
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>(initReceiptStatus);
  const [verificationId, setVerificationId] = useState<string | null>(initialReceiptId);
  const [receiptPoints, setReceiptPoints] = useState(0);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  // ── Step 3 — Voto
  const [voteStatus, setVoteStatus] = useState<VoteStatus>(hasVotedRecently ? "cooldown" : "ready");
  const [rating, setRating] = useState(0);

  // ── Auto-start check-in
  useEffect(() => {
    doCheckin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-poll receipt quando in stato "polling" e nella fase receipt
  useEffect(() => {
    if (phase !== "receipt" || receiptStatus !== "polling" || !verificationId) return;
    const interval = setInterval(() => pollReceipt(), 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, receiptStatus, verificationId]);

  // ── Auto-avanza receipt se già caricato oggi (con brief delay)
  useEffect(() => {
    if (phase !== "receipt" || !initialReceiptId) return;
    if (receiptStatus === "polling") return; // mostra stato in elaborazione, non auto-avanzare
    const t = setTimeout(() => proceedToVote(), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, initialReceiptId, receiptStatus]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Check-in
  // ─────────────────────────────────────────────────────────────────────────────

  async function doScan(geoVerified: boolean) {
    setCheckinStatus("scanning");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, geo_verified: geoVerified }),
      });
      const data = await res.json();

      if (!data.ok) {
        setCheckinError(
          data.error === "not_logged"
            ? "Devi essere loggato per fare check-in."
            : data.error || "Errore durante il check-in."
        );
        setCheckinStatus("error");
        return;
      }

      if (data.already) {
        setCheckinStatus("already");
        setCheckinPoints(0);
      } else {
        setCheckinStatus("success");
        setCheckinPoints(data.points_awarded ?? 0);
      }
    } catch {
      setCheckinError("Errore di rete. Controlla la connessione e riprova.");
      setCheckinStatus("error");
    }
  }

  async function doCheckin() {
    if (spotLat == null || spotLng == null) {
      setGeoState("verified");
      await doScan(true);
      return;
    }

    if (!navigator.geolocation) {
      setGeoState("unavailable");
      await doScan(false);
      return;
    }

    setGeoState("requesting");
    setCheckinStatus("geo_checking");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const dist = haversine(pos.coords.latitude, pos.coords.longitude, spotLat, spotLng);
        setDistanceM(Math.round(dist));
        if (dist <= GEO_RADIUS_M) {
          setGeoState("verified");
          await doScan(true);
        } else {
          setGeoState("too_far");
          setCheckinStatus("too_far");
          setCheckinError(
            `Sei a ${Math.round(dist)} m da ${venueName}. Devi essere fisicamente nello spot per fare check-in.`
          );
        }
      },
      async () => {
        setGeoState("denied");
        await doScan(false);
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }

  function proceedToReceipt() {
    setPhase("receipt");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Scontrino
  // ─────────────────────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!f) return;
    await uploadReceipt(f);
  }

  async function uploadReceipt(file: File) {
    setReceiptStatus("uploading");
    try {
      const fd = new FormData();
      fd.append("venue_id", venueId);
      fd.append("file", file);
      const res = await fetch("/api/receipt/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!data.ok) {
        setReceiptStatus("idle");
        return;
      }

      setVerificationId(data.verification_id);
      if (data.status === "approved") {
        setReceiptStatus("approved");
      } else {
        setReceiptStatus("polling");
      }
    } catch {
      setReceiptStatus("idle");
    }
  }

  async function pollReceipt() {
    if (!verificationId) return;
    try {
      const res = await fetch(
        `/api/receipt/process?id=${encodeURIComponent(verificationId)}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.ok && data.status === "approved") {
        setReceiptStatus("approved");
        if (data.points_awarded) setReceiptPoints(data.points_awarded);
      } else if (data.ok && data.status === "rejected") {
        setReceiptStatus("rejected");
      }
    } catch {}
  }

  function skipReceipt() {
    setReceiptStatus("skipped");
    proceedToVote();
  }

  function proceedToVote() {
    setPhase("vote");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Voto
  // ─────────────────────────────────────────────────────────────────────────────

  async function submitVote() {
    if (rating < 1 || rating > 5) return;
    setVoteStatus("submitting");
    try {
      const res = await fetch("/api/checkin/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: venueId, rating }),
      });
      const data = await res.json();
      if (data.ok) {
        setVoteStatus("done");
        setTimeout(() => setPhase("done"), 1400);
      } else {
        setVoteStatus("ready");
      }
    } catch {
      setVoteStatus("ready");
    }
  }

  function skipVote() {
    setVoteStatus("skipped");
    setPhase("done");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  const sessionPoints = checkinPoints + receiptPoints;

  function renderCheckin() {
    // Loading / GPS
    if (checkinStatus === "idle" || checkinStatus === "geo_checking") {
      return (
        <div style={{ textAlign: "center", padding: "36px 16px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {checkinStatus === "geo_checking" ? "📡" : "⏳"}
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
            {checkinStatus === "geo_checking"
              ? "Verifica posizione GPS..."
              : "Avvio check-in..."}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            {checkinStatus === "geo_checking"
              ? "Assicurati di essere vicino allo spot (entro 100 m)"
              : "Un momento..."}
          </p>
        </div>
      );
    }

    if (checkinStatus === "scanning") {
      return (
        <div style={{ textAlign: "center", padding: "36px 16px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Registrazione presenza...</div>
        </div>
      );
    }

    // Troppo lontano
    if (checkinStatus === "too_far") {
      return (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🚫</div>
          <div style={{ fontWeight: 900, fontSize: 20, color: "#dc2626", marginBottom: 10 }}>
            Devi essere nello spot
          </div>
          <p style={{ color: "#dc2626", margin: "0 0 14px", fontSize: 14, lineHeight: 1.5 }}>
            {checkinError}
          </p>
          {distanceM != null && (
            <div
              style={{
                display: "inline-block",
                padding: "6px 18px",
                borderRadius: 20,
                background: "rgba(239,68,68,0.1)",
                color: "#dc2626",
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 22,
              }}
            >
              📍 {distanceM} m dal locale
            </div>
          )}
          <div>
            <button
              className="btn"
              onClick={() => {
                setGeoState("idle");
                setCheckinStatus("idle");
                setCheckinError(null);
                setDistanceM(null);
                doCheckin();
              }}
            >
              Riprova
            </button>
          </div>
        </div>
      );
    }

    // Errore generico
    if (checkinStatus === "error") {
      return (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>❌</div>
          <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 8, fontSize: 17 }}>
            Errore check-in
          </div>
          <p className="muted" style={{ margin: "0 0 20px", fontSize: 14 }}>
            {checkinError}
          </p>
          <button
            className="btn"
            onClick={() => {
              setGeoState("idle");
              setCheckinStatus("idle");
              setCheckinError(null);
              doCheckin();
            }}
          >
            Riprova
          </button>
        </div>
      );
    }

    // Già check-in oggi
    if (checkinStatus === "already") {
      return (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
            Presenza già registrata oggi
          </div>
          <p className="muted" style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.5 }}>
            Hai già fatto check-in qui oggi. Puoi comunque caricare lo scontrino o lasciare un voto.
          </p>
          <button
            className="btn primary"
            onClick={proceedToReceipt}
            style={{ width: "100%", maxWidth: 260, padding: "14px" }}
          >
            Continua →
          </button>
        </div>
      );
    }

    // Successo
    return (
      <div style={{ textAlign: "center", padding: "28px 16px" }}>
        <div style={{ fontSize: 60, marginBottom: 14 }}>🎉</div>
        <div style={{ fontWeight: 900, fontSize: 28, color: "#059669", marginBottom: 4 }}>
          +{checkinPoints} {checkinPoints === 1 ? "punto" : "punti"}!
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>
          Check-in completato!
        </div>
        {geoState === "denied" && (
          <div
            style={{
              display: "inline-block",
              padding: "5px 16px",
              borderRadius: 16,
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#b45309",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            ⚠️ GPS non verificato — 1 punto invece di 2
          </div>
        )}
        <p className="muted" style={{ margin: "8px 0 24px", fontSize: 14 }}>
          Vuoi guadagnare altri <b>+8 punti</b> caricando lo scontrino?
        </p>
        <button
          className="btn primary"
          onClick={proceedToReceipt}
          style={{ width: "100%", maxWidth: 260, padding: "14px" }}
        >
          Continua →
        </button>
      </div>
    );
  }

  function renderReceipt() {
    // Scontrino già caricato oggi (initialReceiptId presente) → mostra stato e auto-avanza
    if (initialReceiptId) {
      if (receiptStatus === "polling") {
        return (
          <div style={{ textAlign: "center", padding: "28px 16px" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>⏳</div>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
              Scontrino in elaborazione...
            </div>
            <p className="muted" style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.5 }}>
              Lo scontrino caricato è ancora in revisione. Riceverai i punti non appena viene approvato.
            </p>
            <button className="btn" onClick={proceedToVote}>
              Continua al voto →
            </button>
          </div>
        );
      }
      if (receiptStatus === "approved") {
        return (
          <div style={{ textAlign: "center", padding: "28px 16px" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🧾✅</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#059669", marginBottom: 6 }}>
              Scontrino approvato!
            </div>
            <p className="muted" style={{ margin: "0 0 8px", fontSize: 14 }}>
              Già caricato oggi — avanzamento automatico...
            </p>
          </div>
        );
      }
      if (receiptStatus === "rejected") {
        return (
          <div style={{ textAlign: "center", padding: "28px 16px" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🧾❌</div>
            <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 8, fontSize: 17 }}>
              Scontrino non approvato
            </div>
            <p className="muted" style={{ margin: "0 0 8px", fontSize: 14 }}>
              Lo scontrino caricato in precedenza non è stato approvato — avanzamento automatico...
            </p>
          </div>
        );
      }
    }

    // Upload in corso
    if (receiptStatus === "uploading") {
      return (
        <div style={{ textAlign: "center", padding: "36px 16px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Caricamento scontrino...</div>
        </div>
      );
    }

    // In elaborazione AI (upload effettuato questa sessione)
    if (receiptStatus === "polling") {
      return (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🤖</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
            Scontrino in elaborazione...
          </div>
          <p className="muted" style={{ margin: "0 0 6px", fontSize: 14, lineHeight: 1.5 }}>
            L'AI sta analizzando il tuo scontrino. Il risultato arriva in pochi secondi.
          </p>
          <p className="muted" style={{ margin: "0 0 24px", fontSize: 12 }}>
            Aggiornamento automatico ogni 6 secondi
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <button className="btn" onClick={() => pollReceipt()}>
              Aggiorna ora
            </button>
            <button
              className="btn"
              onClick={proceedToVote}
              style={{ color: "rgba(0,0,0,0.4)", fontSize: 13 }}
            >
              Salta e vai al voto →
            </button>
          </div>
        </div>
      );
    }

    // Approvato (questa sessione)
    if (receiptStatus === "approved") {
      return (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <div style={{ fontSize: 60, marginBottom: 14 }}>🧾✅</div>
          <div style={{ fontWeight: 900, fontSize: 26, color: "#059669", marginBottom: 4 }}>
            {receiptPoints > 0 ? `+${receiptPoints} punti!` : "+8 punti!"}
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
            Consumazione confermata!
          </div>
          <p className="muted" style={{ margin: "0 0 24px", fontSize: 14 }}>
            Ottimo! Vuoi anche lasciare un voto allo spot?
          </p>
          <button
            className="btn primary"
            onClick={proceedToVote}
            style={{ width: "100%", maxWidth: 260, padding: "14px" }}
          >
            Continua →
          </button>
        </div>
      );
    }

    // Rifiutato (questa sessione)
    if (receiptStatus === "rejected") {
      return (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🧾❌</div>
          <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 8, fontSize: 17 }}>
            Scontrino non approvato
          </div>
          <p className="muted" style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.5 }}>
            Lo scontrino non soddisfa i requisiti: importo minimo €3, data odierna, nome del locale corrispondente.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <button
              className="btn"
              onClick={() => {
                setReceiptStatus("idle");
                setVerificationId(null);
              }}
            >
              Carica un altro scontrino
            </button>
            <button
              className="btn"
              onClick={proceedToVote}
              style={{ color: "rgba(0,0,0,0.4)", fontSize: 13 }}
            >
              Salta →
            </button>
          </div>
        </div>
      );
    }

    // Form upload (idle)
    return (
      <div style={{ padding: "8px 0" }}>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🧾</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
            Carica lo scontrino
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            Guadagna <b>+8 punti</b> caricando la foto del tuo scontrino.
            L'AI lo verifica in automatico.
          </p>
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
            Requisiti: importo min. €3 · data odierna · nome del locale corrispondente
          </p>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <button
            className="btn primary"
            onClick={() => cameraRef.current?.click()}
            style={{
              padding: "16px",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <span>📸</span> Scatta foto scontrino
          </button>
          <button
            className="btn"
            onClick={() => galleryRef.current?.click()}
            style={{ padding: "13px", fontSize: 14 }}
          >
            Carica da galleria
          </button>
          <button
            className="btn"
            onClick={skipReceipt}
            style={{ color: "rgba(0,0,0,0.4)", fontSize: 13, padding: "12px" }}
          >
            Salta questo step →
          </button>
        </div>
      </div>
    );
  }

  function renderVote() {
    if (voteStatus === "cooldown") {
      return (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>⏰</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
            Hai già votato di recente
          </div>
          <p className="muted" style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.5 }}>
            Puoi votare ogni spot al massimo una volta ogni 7 giorni.
          </p>
          {nextVoteAt && (
            <p className="muted" style={{ margin: "0 0 24px", fontSize: 13 }}>
              Prossimo voto disponibile: <b>{fmtDate(nextVoteAt)}</b>
            </p>
          )}
          <button
            className="btn primary"
            onClick={() => setPhase("done")}
            style={{ width: "100%", maxWidth: 260, padding: "14px" }}
          >
            Termina →
          </button>
        </div>
      );
    }

    if (voteStatus === "submitting") {
      return (
        <div style={{ textAlign: "center", padding: "36px 16px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Invio voto...</div>
        </div>
      );
    }

    if (voteStatus === "done") {
      return (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>⭐</div>
          <div style={{ fontWeight: 900, fontSize: 22, color: "#059669", marginBottom: 6 }}>
            Voto inviato!
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Grazie per il tuo feedback su {venueName}!
          </p>
        </div>
      );
    }

    // ready
    return (
      <div style={{ padding: "8px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>⭐</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
            Come valuti {venueName}?
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Il tuo voto è visibile pubblicamente e aiuta altri esploratori.
          </p>
        </div>

        <StarPicker value={rating} onChange={setRating} />

        <div style={{ display: "grid", gap: 10 }}>
          <button
            className="btn primary"
            onClick={submitVote}
            disabled={rating < 1}
            style={{ padding: "16px", fontSize: 16 }}
          >
            Invia voto {rating > 0 ? `(${rating}/5 ⭐)` : ""}
          </button>
          <button
            className="btn"
            onClick={skipVote}
            style={{ color: "rgba(0,0,0,0.4)", fontSize: 13, padding: "12px" }}
          >
            Salta questo step →
          </button>
        </div>
      </div>
    );
  }

  function renderDone() {
    const receiptSummary = () => {
      if (receiptStatus === "skipped") return { label: "saltato", color: "rgba(0,0,0,0.35)" };
      if (receiptStatus === "polling") return { label: "in elaborazione ⏳", color: "#b45309" };
      if (receiptStatus === "approved") return {
        label: receiptPoints > 0 ? `+${receiptPoints} pt` : "+8 pt",
        color: "#059669",
      };
      if (receiptStatus === "rejected") return { label: "non approvato", color: "#dc2626" };
      return { label: "—", color: "rgba(0,0,0,0.35)" };
    };

    const voteSummary = () => {
      if (voteStatus === "done") return { label: `${rating}/5 ⭐`, color: "#6366f1" };
      if (voteStatus === "cooldown") return { label: "già votato", color: "rgba(0,0,0,0.35)" };
      return { label: "saltato", color: "rgba(0,0,0,0.35)" };
    };

    const rs = receiptSummary();
    const vs = voteSummary();

    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
        <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 6 }}>Sessione completata!</div>
        <p className="muted" style={{ margin: "0 0 24px", fontSize: 14 }}>
          Ecco un riepilogo di questa visita a <b>{venueName}</b>.
        </p>

        <div
          style={{
            display: "grid",
            gap: 12,
            padding: "20px",
            borderRadius: 18,
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.15)",
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 11,
              color: "rgba(0,0,0,0.4)",
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Riepilogo punti
          </div>

          {[
            {
              label: "Check-in",
              value: checkinPoints > 0 ? `+${checkinPoints} pt` : checkinStatus === "already" ? "già fatto" : "—",
              color: checkinPoints > 0 ? "#059669" : "rgba(0,0,0,0.35)",
            },
            { label: "Scontrino", value: rs.label, color: rs.color },
            { label: "Voto", value: vs.label, color: vs.color },
          ].map((row) => (
            <div
              key={row.label}
              style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 15 }}
            >
              <span>{row.label}</span>
              <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}

          {sessionPoints > 0 && (
            <>
              <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "4px 0" }} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                <span>Totale sessione</span>
                <span style={{ color: "#059669" }}>+{sessionPoints} pt</span>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "grid", gap: 10, maxWidth: 280, margin: "0 auto" }}>
          <Link
            className="btn primary"
            href="/"
            style={{
              padding: "16px",
              fontSize: 16,
              textDecoration: "none",
              textAlign: "center",
              display: "block",
            }}
          >
            🏠 Torna alla home
          </Link>
          <Link
            className="btn"
            href="/me"
            style={{ textDecoration: "none", textAlign: "center", display: "block" }}
          >
            Vedi i tuoi punti
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {phase !== "done" && <StepIndicator phase={phase} />}
      {phase === "checkin" && renderCheckin()}
      {phase === "receipt" && renderReceipt()}
      {phase === "vote" && renderVote()}
      {phase === "done" && renderDone()}
    </div>
  );
}
