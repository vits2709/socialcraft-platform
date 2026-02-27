"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pwa-banner-dismissed";

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<(Event & { prompt: () => void }) | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Non mostrare se già installata (standalone) o su desktop
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Non mostrare se l'utente ha già chiuso il banner
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Cattura l'evento beforeinstallprompt (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Event & { prompt: () => void });
      // Mostra il banner dopo 4s per non intralciare l'onboarding
      setTimeout(() => setVisible(true), 4000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !prompt) return null;

  function install() {
    prompt?.prompt();
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1100,
        background: "rgba(45,27,105,0.97)",
        color: "#fff",
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 24px rgba(45,27,105,0.45)",
        fontSize: 13,
        fontWeight: 600,
        backdropFilter: "blur(8px)",
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>📱</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>
        Installa CityQuest sulla home screen per un&apos;esperienza migliore
      </span>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={install}
          style={{
            background: "#fff",
            color: "#2D1B69",
            border: "none",
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          Installa
        </button>
        <button
          onClick={dismiss}
          aria-label="Chiudi"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "#fff",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
