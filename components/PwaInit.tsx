"use client";

import { useEffect } from "react";

/**
 * Registra il service worker /sw.js globalmente su ogni pagina.
 * Necessario per PWA installability (Chrome/Android).
 * Non richiede permessi, non mostra UI.
 * Separato da PushNotificationSetup che gestisce la sottoscrizione VAPID.
 */
export default function PwaInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration non critica — non blocca l'app
      });
    }
  }, []);

  return null;
}
