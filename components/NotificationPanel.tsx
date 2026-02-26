"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

const TYPE_ICONS: Record<string, string> = {
  mission_assigned: "🎯",
  mission_completed: "✅",
  prize_won: "🏆",
  prize_expiring: "🎁",
  overtaken: "📈",
  promo_active: "🔥",
  badge_unlocked: "🎖️",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "ora" : "ore"} fa`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "giorno" : "giorni"} fa`;
}

export default function NotificationPanel({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function fetchNotifs() {
    if (!isLoggedIn) return;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setNotifs(json.notifications ?? []);
        setUnread(json.unread ?? 0);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        const panel = document.getElementById("notif-panel");
        if (panel && !panel.contains(e.target as Node)) {
          setOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Escape per chiudere
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function clearRead() {
    await fetch("/api/notifications/clear-read", { method: "DELETE" }).catch(() => {});
    setNotifs((prev) => prev.filter((n) => !n.read));
  }

  if (!isLoggedIn) return null;

  return (
    <>
      {/* Bell icon button */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifiche${unread > 0 ? ` (${unread} non lette)` : ""}`}
        aria-expanded={open}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          color: "inherit",
          transition: "background 0.15s",
        }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1,
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Pannello slide-in portaled */}
      {open && mounted && createPortal(
        <>
          {/* Overlay */}
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1199,
              background: "rgba(0,0,0,0.25)",
            }}
          />

          {/* Panel */}
          <div
            id="notif-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Notifiche"
            style={{
              position: "fixed",
              top: 60,
              right: 16,
              width: 360,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "calc(100vh - 80px)",
              zIndex: 1200,
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,0.08)",
              animation: "notifSlideIn 0.18s ease",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 16px 10px",
                borderBottom: "1px solid rgba(0,0,0,0.07)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 15, flex: 1 }}>
                Notifiche
                {unread > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      padding: "2px 7px",
                      borderRadius: 999,
                      background: "rgba(239,68,68,0.12)",
                      color: "#dc2626",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#6366f1",
                    padding: "4px 6px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  Segna tutte
                </button>
              )}
              {notifs.some((n) => n.read) && (
                <button
                  onClick={clearRead}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#9ca3af",
                    padding: "4px 6px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  Svuota lette
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifs.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    opacity: 0.5,
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                  Nessuna notifica
                </div>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.read) markRead(n.id); }}
                    role={!n.read ? "button" : undefined}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(0,0,0,0.05)",
                      background: n.read ? "transparent" : "rgba(99,102,241,0.08)",
                      cursor: n.read ? "default" : "pointer",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: "6px 10px",
                      alignItems: "start",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 18, marginTop: 1 }}>
                      {TYPE_ICONS[n.type] ?? "🔔"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: n.read ? 700 : 900,
                          fontSize: 13,
                          lineHeight: 1.35,
                        }}
                      >
                        {n.title}
                      </div>
                      {n.body && (
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.7,
                            marginTop: 2,
                            lineHeight: 1.4,
                          }}
                        >
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.read && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: "#6366f1",
                          marginTop: 4,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <style>{`
            @keyframes notifSlideIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </>,
        document.body
      )}
    </>
  );
}
