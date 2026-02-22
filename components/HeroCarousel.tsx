"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { getExplorerLevel } from "@/lib/levels";

export type CarouselPrize = {
  description: string;
  venueName: string | null;
  weekStart: string;
} | null;

type Props = {
  username: string | null;
  totalPoints: number;
  weeklyRank: number | null;
  prize: CarouselPrize;
  isLoggedIn: boolean;
};

function useCountdown(weekStart: string | null): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!weekStart) return;

    function compute() {
      const end = new Date(weekStart + "T00:00:00Z");
      end.setUTCDate(end.getUTCDate() + 7);
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setLabel("Scaduto"); return; }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      if (days > 0) setLabel(`${days}g ${hours}h`);
      else if (hours > 0) setLabel(`${hours}h ${mins}m`);
      else setLabel(`${mins}m`);
    }

    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [weekStart]);

  return label;
}

const TOTAL = 3;

export default function HeroCarousel({ username, totalPoints, weeklyRank, prize, isLoggedIn }: Props) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const level = getExplorerLevel(totalPoints);
  const countdown = useCountdown(prize?.weekStart ?? null);

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx(i => Math.min(TOTAL - 1, i + 1)), []);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) next();
    else if (dx > 40) prev();
    touchStartX.current = null;
  }

  const displayName = username
    ? username.split(" ")[0]
    : isLoggedIn ? "Esploratore" : "Esploratore";

  const cardStyle: React.CSSProperties = {
    width: `${100 / TOTAL}%`,
    flexShrink: 0,
    padding: "16px 18px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    userSelect: "none",
    boxSizing: "border-box",
  };

  const glassBox: React.CSSProperties = {
    background: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: "10px 14px",
  };

  const ctaLink: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.35)",
    color: "#fff",
    borderRadius: 12,
    padding: "9px 16px",
    fontWeight: 700,
    fontSize: 13,
    textDecoration: "none",
    alignSelf: "flex-start",
  };

  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    width: 30,
    height: 30,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div
      style={{
        position: "relative",
        marginTop: 14,
        borderRadius: 18,
        overflow: "hidden",
        width: "100%",
        background: "linear-gradient(135deg, #2D1B69 0%, #7BC043 100%)",
        boxShadow: "0 8px 28px rgba(45,27,105,0.22)",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Arrow prev — desktop only */}
      {idx > 0 && (
        <button
          className="carouselArrow"
          onClick={prev}
          aria-label="Precedente"
          style={{ ...arrowStyle, left: 8 }}
        >
          ‹
        </button>
      )}

      {/* Arrow next — desktop only */}
      {idx < TOTAL - 1 && (
        <button
          className="carouselArrow"
          onClick={next}
          aria-label="Successivo"
          style={{ ...arrowStyle, right: 8 }}
        >
          ›
        </button>
      )}

      {/* Track — 300% wide so each card occupies exactly 1/3 = 100% of the viewport */}
      <div
        style={{
          display: "flex",
          width: `${TOTAL * 100}%`,
          transform: `translateX(-${idx * (100 / TOTAL)}%)`,
          transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
      >
        {/* ── Card 1: Benvenuto ─────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
            CityQuest
          </div>

          <h2 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.2 }}>
            Ciao {displayName}! 👋
          </h2>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ ...glassBox, flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                CLASS. SETT.
              </div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, marginTop: 2 }}>
                {weeklyRank != null ? `#${weeklyRank}` : "—"}
              </div>
            </div>
            <div style={{ ...glassBox, flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                PUNTI TOTALI
              </div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, marginTop: 2 }}>
                {totalPoints}
              </div>
            </div>
          </div>

          {/* Level progress */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                {level.current.emoji} {level.current.name}
              </div>
              {level.next ? (
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                  {level.toNext} pt → {level.next.name}
                </div>
              ) : (
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>Livello max 👑</div>
              )}
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.88)",
                  width: `${level.progress}%`,
                  transition: "width 600ms var(--easeOut)",
                }}
              />
            </div>
          </div>

          <Link href="/me" style={ctaLink}>
            Il mio profilo →
          </Link>
        </div>

        {/* ── Card 2: Premio ────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
            Ogni settimana
          </div>

          {prize ? (
            <>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.2 }}>
                🎁 Premio della settimana
              </h2>

              <div style={glassBox}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>
                  {prize.description}
                </div>
                {prize.venueName && (
                  <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 4 }}>
                    Offerto da {prize.venueName}
                  </div>
                )}
              </div>

              {countdown && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.14)",
                    borderRadius: 999,
                    padding: "6px 14px",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    alignSelf: "flex-start",
                  }}
                >
                  ⏱ Scade tra {countdown}
                </div>
              )}

              <Link href="/leaderboard" style={ctaLink}>
                Classifica settimanale →
              </Link>
            </>
          ) : (
            <>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.2 }}>
                Premio in arrivo... 🎁
              </h2>

              <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 15, margin: 0, lineHeight: 1.55 }}>
                Gli spot stanno preparando premi speciali per i migliori esploratori. Continua a esplorare!
              </p>

              <div style={{ ...glassBox, color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.5 }}>
                🏆 Chi accumula più punti questa settimana vince
              </div>
            </>
          )}
        </div>

        {/* ── Card 3: Missione ──────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
            Ogni giorno
          </div>

          <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.2 }}>
            🎯 Missione del giorno
          </h2>

          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1.5px dashed rgba(255,255,255,0.28)",
              borderRadius: 16,
              padding: "20px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 10 }}>🔜</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
              In arrivo!
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.5 }}>
              Le missioni giornaliere saranno disponibili prossimamente. Continua a esplorare la città!
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          padding: "8px 0 14px",
        }}
      >
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              width: idx === i ? 20 : 7,
              height: 7,
              borderRadius: 4,
              background: idx === i ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "all 300ms",
            }}
          />
        ))}
      </div>
    </div>
  );
}
