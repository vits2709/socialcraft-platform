"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type JoinStatus = "idle" | "geo_requesting" | "joining" | "success" | "error";

type JoinResult = {
  points_awarded: number;
  venue_name: string;
  venue_slug: string;
  badge_unlocked: boolean;
  already_checked_in: boolean;
};

export default function CompanionClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";

  const [status, setStatus] = useState<JoinStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JoinResult | null>(null);

  useEffect(() => {
    if (code) {
      joinGroup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function joinGroup() {
    if (!navigator.geolocation) {
      setError("GPS non disponibile. Devi essere fisicamente nello spot per unirti al gruppo.");
      setStatus("error");
      return;
    }

    setStatus("geo_requesting");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await doJoin(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setError("GPS non disponibile. Devi essere fisicamente nello spot per unirti al gruppo.");
        setStatus("error");
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }

  async function doJoin(lat: number, lng: number) {
    setStatus("joining");
    try {
      const res = await fetch("/api/companion/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, lat, lng }),
      });
      const data = await res.json();

      if (!data.ok) {
        const msgs: Record<string, string> = {
          not_logged: "Devi essere loggato per unirti al gruppo.",
          code_not_found: "Codice non trovato. Verifica il codice e riprova.",
          code_expired: "Il codice è scaduto. Chiedi al tuo amico di generarne uno nuovo.",
          too_far: `Sei troppo lontano dallo spot (${data.distance_m ?? "?"}m). Devi essere fisicamente nel locale.`,
          already_joined: "Hai già usato questo codice.",
          creator_cannot_join: "Non puoi unirti al tuo stesso codice.",
          no_checkin_today: "Il creatore del codice non ha ancora fatto check-in oggi.",
        };
        setError(msgs[data.error] ?? data.error ?? "Errore sconosciuto.");
        setStatus("error");
        return;
      }

      setResult(data);
      setStatus("success");
    } catch {
      setError("Errore di rete. Controlla la connessione e riprova.");
      setStatus("error");
    }
  }

  return (
    <div className="page" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div
        style={{
          maxWidth: 360,
          margin: "0 auto",
          padding: "32px 20px",
          borderRadius: 22,
          background: "#fff",
          boxShadow: "0 2px 24px rgba(0,0,0,0.07)",
          textAlign: "center",
        }}
      >
        {(status === "idle" || status === "geo_requesting") && (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>👥</div>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>
              Unisciti al gruppo
            </div>
            {code && (
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#6366f1",
                  letterSpacing: 2,
                  marginBottom: 16,
                }}
              >
                {code}
              </div>
            )}
            <p className="muted" style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.5 }}>
              {status === "geo_requesting"
                ? "📡 Verifica posizione GPS in corso..."
                : "Verifica posizione e check-in di gruppo..."}
            </p>
            {!code && (
              <p style={{ color: "#dc2626", fontSize: 14, fontWeight: 600 }}>
                Nessun codice trovato nell&apos;URL.
              </p>
            )}
          </>
        )}

        {status === "joining" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Registrazione in corso...</div>
          </>
        )}

        {status === "success" && result && (
          <>
            <div style={{ fontSize: 60, marginBottom: 14 }}>🎉</div>
            <div style={{ fontWeight: 900, fontSize: 26, color: "#059669", marginBottom: 4 }}>
              {result.already_checked_in
                ? "Gruppo registrato!"
                : `+${result.points_awarded} ${result.points_awarded === 1 ? "punto" : "punti"}!`}
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>
              Check-in di gruppo completato!
            </div>
            {result.venue_name && (
              <p className="muted" style={{ margin: "0 0 8px", fontSize: 14 }}>
                Sei stato registrato a <b>{result.venue_name}</b>
              </p>
            )}
            {result.already_checked_in && (
              <p className="muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
                Avevi già fatto check-in oggi — gruppo confermato.
              </p>
            )}
            {result.badge_unlocked && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.1))",
                  border: "1px solid rgba(99,102,241,0.3)",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#6366f1",
                  margin: "12px 0",
                }}
              >
                👥 Badge &ldquo;In Compagnia&rdquo; sbloccato!
              </div>
            )}
            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 24,
                maxWidth: 260,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {result.venue_slug && (
                <Link
                  className="btn primary"
                  href={`/checkin/${result.venue_slug}`}
                  style={{ textAlign: "center", display: "block", padding: "14px" }}
                >
                  Continua il check-in →
                </Link>
              )}
              <Link
                className="btn"
                href="/"
                style={{ textAlign: "center", display: "block" }}
              >
                Torna alla home
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 52, marginBottom: 14 }}>
              {error?.includes("loggato") ? "🔐" : "❌"}
            </div>
            <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 8, fontSize: 17 }}>
              {error?.includes("loggato") ? "Accesso richiesto" : "Impossibile unirsi"}
            </div>
            <p className="muted" style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.5 }}>
              {error}
            </p>
            <div style={{ display: "grid", gap: 10, maxWidth: 260, margin: "0 auto" }}>
              {error?.includes("loggato") ? (
                <Link
                  className="btn primary"
                  href={`/login?redirect=/companion?code=${encodeURIComponent(code)}`}
                  style={{ textAlign: "center", display: "block", padding: "14px" }}
                >
                  Accedi
                </Link>
              ) : (
                <button className="btn" onClick={joinGroup}>
                  Riprova
                </button>
              )}
              <Link
                className="btn"
                href="/"
                style={{ textAlign: "center", display: "block", fontSize: 13 }}
              >
                Torna alla home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
