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
  const outerRef = useRef<HTMLDivElement>(null);
  // slideWidth = measured px width of the outer container
  const [slideWidth, setSlideWidth] = useState(0);

  const level = getExplorerLevel(totalPoints);
  const countdown = useCountdown(prize?.weekStart ?? null);

  // Measure container width once mounted and on every resize
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setSlideWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const displayName = username ? username.split(" ")[0] : "Esploratore";

  // Shared styles
  const glass: React.CSSProperties = {
    background: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: "8px 12px",
  };
  const cta: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.35)",
    color: "#fff",
    borderRadius: 10,
    padding: "7px 14px",
    fontWeight: 700,
    fontSize: 13,
    textDecoration: "none",
    alignSelf: "flex-start",
    marginTop: 2,
  };
  const label12: React.CSSProperties = {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.3,
  };
  const h2style: React.CSSProperties = {
    margin: 0,
    color: "#fff",
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: -0.2,
    lineHeight: 1.2,
  };

  // Card width: use measured pixels so the track never overflows
  const cw = slideWidth > 0 ? slideWidth : undefined;

  const cardBase: React.CSSProperties = {
    flexShrink: 0,
    width: cw,
    // fallback before first measurement: card fills outer (track won't overflow
    // because outer is overflow:hidden and slideWidth=0 → transform=0)
    minWidth: cw === undefined ? "100%" : undefined,
    padding: "14px 16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxSizing: "border-box",
  };

  const arrowBase: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    width: 28,
    height: 28,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div
      ref={outerRef}
      style={{
        position: "relative",
        borderRadius: 18,
        overflow: "hidden",
        width: "100%",
        minWidth: 0,        /* prevent grid item from expanding */
        background: "linear-gradient(135deg, #2D1B69 0%, #7BC043 100%)",
        boxShadow: "0 6px 24px rgba(45,27,105,0.20)",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Desktop arrows */}
      {idx > 0 && (
        <button className="carouselArrow" onClick={prev} aria-label="Precedente"
          style={{ ...arrowBase, left: 8 }}>‹</button>
      )}
      {idx < TOTAL - 1 && (
        <button className="carouselArrow" onClick={next} aria-label="Successivo"
          style={{ ...arrowBase, right: 8 }}>›</button>
      )}

      {/* Track — translateX in px avoids 300%-width overflow issues */}
      <div
        style={{
          display: "flex",
          transform: `translateX(-${idx * (slideWidth || 0)}px)`,
          transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
      >
        {/* ── Card 1: Benvenuto ── */}
        <div style={cardBase}>
          <div style={label12}>CityQuest</div>

          <h2 style={h2style}>Ciao {displayName}! 👋</h2>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ ...glass, flex: 1, minWidth: 0 }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}>
                CLASS. SETT.
              </div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 900, marginTop: 1 }}>
                {weeklyRank != null ? `#${weeklyRank}` : "—"}
              </div>
            </div>
            <div style={{ ...glass, flex: 1, minWidth: 0 }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}>
                PUNTI TOTALI
              </div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 900, marginTop: 1 }}>
                {totalPoints}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
                {level.current.emoji} {level.current.name}
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                {level.next ? `${level.toNext} pt → ${level.next.name}` : "Livello max 👑"}
              </div>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999,
                background: "rgba(255,255,255,0.88)",
                width: `${level.progress}%`,
                transition: "width 600ms",
              }} />
            </div>
          </div>

          <Link href="/me" style={cta}>Il mio profilo →</Link>
        </div>

        {/* ── Card 2: Premio ── */}
        <div style={cardBase}>
          <div style={label12}>Ogni settimana</div>

          {prize ? (
            <>
              <h2 style={h2style}>🎁 Premio della settimana</h2>
              <div style={glass}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{prize.description}</div>
                {prize.venueName && (
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 3 }}>
                    Offerto da {prize.venueName}
                  </div>
                )}
              </div>
              {countdown && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.14)", borderRadius: 999,
                  padding: "5px 12px", color: "#fff", fontWeight: 700, fontSize: 12,
                  alignSelf: "flex-start",
                }}>
                  ⏱ Scade tra {countdown}
                </div>
              )}
              <Link href="/leaderboard" style={cta}>Classifica settimanale →</Link>
            </>
          ) : (
            <>
              <h2 style={h2style}>Premio in arrivo... 🎁</h2>
              <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                Gli spot stanno preparando premi speciali. Continua a esplorare!
              </p>
              <div style={{ ...glass, color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 1.4 }}>
                🏆 Chi accumula più punti questa settimana vince
              </div>
            </>
          )}
        </div>

        {/* ── Card 3: Missione ── */}
        <div style={cardBase}>
          <div style={label12}>Ogni giorno</div>
          <h2 style={h2style}>🎯 Missione del giorno</h2>
          <div style={{
            background: "rgba(255,255,255,0.1)",
            border: "1.5px dashed rgba(255,255,255,0.28)",
            borderRadius: 14,
            padding: "16px 14px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔜</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, marginBottom: 4 }}>In arrivo!</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 1.45 }}>
              Le missioni giornaliere saranno disponibili prossimamente.
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "6px 0 12px" }}>
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
