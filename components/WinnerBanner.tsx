"use client";

import Link from "next/link";

type WinnerBannerProps = {
  winnerName: string;
  prizeDescription: string;
  venueSlug: string | null;
  venueName: string | null;
  weekStart: string; // YYYY-MM-DD
};

export default function WinnerBanner({
  winnerName,
  prizeDescription,
  venueSlug,
  venueName,
  weekStart,
}: WinnerBannerProps) {
  const weekLabel = (() => {
    try {
      const d = new Date(weekStart + "T12:00:00");
      const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
      const fmt = (dt: Date) =>
        dt.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
      return `${fmt(d)} – ${fmt(end)}`;
    } catch {
      return weekStart;
    }
  })();

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #fef9c3 0%, #fde68a 60%, #fcd34d 100%)",
        border: "2px solid rgba(245,158,11,0.5)",
        borderRadius: 20,
        padding: "20px 18px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Confetti decorativo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -10,
          right: -10,
          fontSize: 64,
          opacity: 0.12,
          transform: "rotate(20deg)",
          pointerEvents: "none",
        }}
      >
        🏆
      </div>

      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
        🎉 Vincitore settimana {weekLabel}
      </div>

      <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.5, marginBottom: 4 }}>
        {winnerName}
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, opacity: 0.8, marginBottom: 12 }}>
        Ha vinto: <b>{prizeDescription}</b>
        {venueName && (
          <>
            {" "}da{" "}
            {venueSlug ? (
              <Link href={`/venue/${venueSlug}`} style={{ color: "inherit", fontWeight: 900 }}>
                {venueName}
              </Link>
            ) : (
              <b>{venueName}</b>
            )}
          </>
        )}
      </div>

      <Link className="btn" href="/me" style={{ fontSize: 13, background: "rgba(0,0,0,0.08)", border: "none" }}>
        Partecipa questa settimana →
      </Link>
    </div>
  );
}
