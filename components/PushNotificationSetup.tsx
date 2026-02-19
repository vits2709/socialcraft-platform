"use client";

import { useEffect, useState } from "react";

// Converte la VAPID public key da base64url a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotificationSetup() {
  const [status, setStatus] = useState<"idle" | "subscribing" | "subscribed" | "denied" | "error">("idle");

  useEffect(() => {
    // Controlla se il browser supporta push notifications
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted") {
      setStatus("subscribed");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
  }, []);

  async function requestPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      setStatus("subscribing");

      // Registra il Service Worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Richiedi permesso
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY non impostata — push disabilitate");
        setStatus("error");
        return;
      }

      // Sottoscrivi al push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const sub = subscription.toJSON();

      // Invia la subscription al server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
        }),
      });

      setStatus("subscribed");
    } catch (e) {
      console.error("Push subscription error:", e);
      setStatus("error");
    }
  }

  // Già subscribed o denied → non mostrare niente (o warning minimo)
  if (status === "subscribed") return null;
  if (status === "denied") return null; // non rompe l'UX

  // Browser non supporta push → nascondi
  if (typeof window !== "undefined" && !("PushManager" in window)) return null;

  if (status === "idle") {
    return (
      <div
        className="notice"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>🔔 Attiva le notifiche</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Ricevi avvisi quando vieni superato in classifica o la settimana sta per finire.
          </div>
        </div>
        <button className="btn primary" onClick={requestPush} style={{ flexShrink: 0 }}>
          Attiva
        </button>
      </div>
    );
  }

  if (status === "subscribing") {
    return (
      <div className="notice" style={{ padding: "12px 16px", fontSize: 13 }}>
        🔔 Attivazione notifiche in corso...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="notice" style={{ padding: "12px 16px", fontSize: 13, color: "#dc2626" }}>
        ⚠️ Notifiche non disponibili su questo dispositivo.
      </div>
    );
  }

  return null;
}
