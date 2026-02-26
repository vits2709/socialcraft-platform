"use client";

import { useEffect, useState } from "react";

export default function OneSignalInit() {
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || typeof window === "undefined") return;

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isStandalone = (window.navigator as { standalone?: boolean }).standalone;

    if (isIos && !isStandalone) {
      // iOS senza PWA — non possiamo fare push, mostra banner informativo
      setShowIosBanner(true);
      return;
    }

    // Inizializza OneSignal
    async function initOneSignal() {
      try {
        const OneSignal = (await import("react-onesignal")).default;
        await OneSignal.init({
          appId: appId!,
          allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
        });

        const playerId = OneSignal.User.PushSubscription.id;
        if (playerId) {
          await fetch("/api/onesignal/player-id", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_id: playerId }),
          }).catch(() => {});
        }
      } catch {
        // OneSignal non disponibile o bloccato
      }
    }

    initOneSignal();
  }, []);

  if (!showIosBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1000,
        background: "rgba(99,102,241,0.97)",
        color: "#fff",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>📱</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>
        Aggiungi CityQuest alla home screen per ricevere notifiche push
      </span>
      <button
        onClick={() => setShowIosBanner(false)}
        aria-label="Chiudi"
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          color: "#fff",
          borderRadius: 8,
          padding: "4px 10px",
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
