"use client";

import { useEffect, useState } from "react";

type GeoState =
  | "idle"
  | "requesting"
  | "verified"   // dentro 100m
  | "denied"     // GPS negato → 1 punto
  | "too_far"    // fuori 100m → bloccato
  | "unavailable"; // browser non supporta geolocation

type CheckinState =
  | "idle"
  | "geo_checking"
  | "scanning"
  | "success"
  | "already"
  | "error";

type ScanResp =
  | { ok: true; already: boolean; geo_verified: boolean; points_awarded: number; total_points: number; message: string }
  | { ok: false; error: string };

/** Formula di Haversine — ritorna distanza in metri */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const GEO_RADIUS_M = 100;

type Props = {
  slug: string;
  venueName: string;
  spotLat: number | null;
  spotLng: number | null;
};

export default function CheckinClient({ slug, venueName, spotLat, spotLng }: Props) {
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [checkinState, setCheckinState] = useState<CheckinState>("idle");
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [result, setResult] = useState<ScanResp | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Avvia il processo automaticamente al mount
  useEffect(() => {
    startCheckin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doScan(geoVerified: boolean) {
    setCheckinState("scanning");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, geo_verified: geoVerified }),
      });
      const data: ScanResp = await res.json();
      setResult(data);

      if (!data.ok) {
        setErrorMsg(data.error === "not_logged" ? "Devi essere loggato." : data.error);
        setCheckinState("error");
      } else if (data.already) {
        setCheckinState("already");
      } else {
        setCheckinState("success");
      }
    } catch {
      setErrorMsg("Errore di rete. Riprova.");
      setCheckinState("error");
    }
  }

  async function startCheckin() {
    // Se lo spot non ha coordinate → salta la geo-verifica
    if (spotLat == null || spotLng == null) {
      setGeoState("verified");
      await doScan(true);
      return;
    }

    // Controlla supporto browser
    if (!navigator.geolocation) {
      setGeoState("unavailable");
      // Permetti check-in senza verifica (equivale a GPS negato)
      await doScan(false);
      return;
    }

    setGeoState("requesting");
    setCheckinState("geo_checking");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const dist = haversine(latitude, longitude, spotLat, spotLng);
        setDistanceM(Math.round(dist));

        if (dist <= GEO_RADIUS_M) {
          setGeoState("verified");
          await doScan(true);
        } else {
          setGeoState("too_far");
          setCheckinState("error");
          setErrorMsg(
            `Devi essere nello spot per guadagnare punti. Sei a ${Math.round(dist)} m da ${venueName}.`
          );
        }
      },
      async (_err) => {
        // Utente ha negato o timeout GPS
        setGeoState("denied");
        await doScan(false);
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  if (checkinState === "idle" || checkinState === "geo_checking") {
    return (
      <div className="notice" style={{ textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>
          {checkinState === "geo_checking" ? "📡" : "⏳"}
        </div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          {checkinState === "geo_checking"
            ? "Verifica posizione GPS..."
            : "Avvio check-in..."}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {checkinState === "geo_checking"
            ? "Controlla che tu sia vicino allo spot (entro 100m)"
            : "Un momento..."}
        </p>
      </div>
    );
  }

  if (checkinState === "scanning") {
    return (
      <div className="notice" style={{ textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
        <div style={{ fontWeight: 700 }}>Registrazione presenza...</div>
      </div>
    );
  }

  if (checkinState === "too_far" || (checkinState === "error" && geoState === "too_far")) {
    return (
      <div
        className="notice"
        style={{
          textAlign: "center",
          padding: 24,
          borderColor: "rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.06)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
        <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 8 }}>
          Troppo lontano dallo spot
        </div>
        <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
          {errorMsg ?? `Devi essere entro ${GEO_RADIUS_M}m da ${venueName} per registrare la presenza.`}
        </p>
        {distanceM != null && (
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 20,
              background: "rgba(239,68,68,0.1)",
              color: "#dc2626",
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            Distanza attuale: {distanceM} m
          </div>
        )}
        <div>
          <button
            className="btn"
            onClick={() => {
              setGeoState("idle");
              setCheckinState("idle");
              setErrorMsg(null);
              setDistanceM(null);
              setResult(null);
              startCheckin();
            }}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (checkinState === "error") {
    return (
      <div
        className="notice"
        style={{
          textAlign: "center",
          padding: 24,
          borderColor: "rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.06)",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>❌</div>
        <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>Errore check-in</div>
        <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>{errorMsg}</p>
        <button
          className="btn"
          onClick={() => {
            setGeoState("idle");
            setCheckinState("idle");
            setErrorMsg(null);
            setResult(null);
            startCheckin();
          }}
        >
          Riprova
        </button>
      </div>
    );
  }

  if (checkinState === "already") {
    return (
      <div className="notice" style={{ textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
          Presenza già registrata oggi
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Torna domani per guadagnare altri punti!
        </p>
      </div>
    );
  }

  if (checkinState === "success" && result?.ok) {
    const pts = result.points_awarded ?? 0;
    const total = result.total_points ?? 0;
    const verified = result.geo_verified !== false;

    return (
      <div
        className="notice"
        style={{
          textAlign: "center",
          padding: 28,
          borderColor: "rgba(16,185,129,0.3)",
          background: "rgba(16,185,129,0.06)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: "#059669", marginBottom: 6 }}>
          +{pts} {pts === 1 ? "punto" : "punti"}!
        </div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Check-in completato!</div>

        {!verified && (
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 14,
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#b45309",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            ⚠️ GPS non verificato — 1 punto invece di 2
          </div>
        )}

        <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
          Totale punti: <b>{total}</b>
        </p>

        {geoState === "denied" && (
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 12 }}>
            Abilita il GPS per guadagnare 2 punti al prossimo check-in.
          </p>
        )}
      </div>
    );
  }

  return null;
}
