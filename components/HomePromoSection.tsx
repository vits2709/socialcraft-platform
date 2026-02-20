"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPromoBonus } from "@/lib/promo-utils";

export type ActivePromoCard = {
  id: string;
  title: string;
  venueName: string;
  venueSlug: string | null;
  venueCategoria: string | null;
  bonusType: string;
  bonusValue: number;
  /** Minuti rimanenti alla fine della promo (calcolati server-side al momento del render) */
  minutesRemaining: number;
};

const CATEGORIA_EMOJI: Record<string, string> = {
  bar: "🍸",
  ristorante: "🍝",
  pizzeria: "🍕",
  caffetteria: "☕",
  pub: "🍺",
  cocktailbar: "🍹",
  lounge: "🛋️",
  club: "🎶",
  gelateria: "🍦",
  pasticceria: "🥐",
  barber: "💈",
  parrucchiere: "✂️",
  estetica: "💅",
  palestra: "🏋️",
};

function getCatEmoji(cat: string | null) {
  if (!cat) return "📍";
  return CATEGORIA_EMOJI[cat.toLowerCase()] ?? "📍";
}

function fmtCountdown(minutes: number): string {
  if (minutes <= 0) return "Scaduta";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m} min` : `${h}h`;
}

function PromoCard({ card }: { card: ActivePromoCard & { mins: number } }) {
  const { title, venueName, venueSlug, venueCategoria, bonusType, bonusValue, mins } = card;
  const expired = mins <= 0;
  const urgent = mins <= 30 && !expired;

  return (
    <div
      style={{
        minWidth: 220,
        maxWidth: 260,
        flexShrink: 0,
        borderRadius: 20,
        background: "linear-gradient(135deg, #fff7ed, #fff)",
        border: `2px solid ${urgent ? "rgba(239,68,68,0.45)" : "rgba(251,146,60,0.4)"}`,
        padding: "16px 18px",
        display: "grid",
        gap: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sfondo decorativo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -30,
          top: -30,
          width: 100,
          height: 100,
          borderRadius: 999,
          background: "rgba(251,146,60,0.08)",
          pointerEvents: "none",
        }}
      />

      {/* Header: emoji + nome spot */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 22 }}>{getCatEmoji(venueCategoria)}</span>
        <div
          style={{
            fontWeight: 950,
            fontSize: 14,
            lineHeight: 1.2,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {venueName}
        </div>
      </div>

      {/* Nome promo */}
      <div style={{ fontWeight: 800, fontSize: 13, color: "#c2410c" }}>{title}</div>

      {/* Bonus */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 999,
          background: "linear-gradient(135deg, #fb923c, #ef4444)",
          color: "#fff",
          fontWeight: 900,
          fontSize: 14,
          alignSelf: "flex-start",
        }}
      >
        🔥 {formatPromoBonus(bonusType, bonusValue)}
      </div>

      {/* Countdown */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: urgent ? "#dc2626" : "#92400e",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span>{urgent ? "⏰" : "⏱"}</span>
        <span>Scade tra {fmtCountdown(mins)}</span>
      </div>

      {/* CTA */}
      {venueSlug && (
        <Link
          className="btn"
          href={`/v/${venueSlug}`}
          style={{
            textAlign: "center",
            fontSize: 13,
            padding: "8px 14px",
            background: "rgba(251,146,60,0.12)",
            borderColor: "rgba(251,146,60,0.3)",
            color: "#c2410c",
            fontWeight: 800,
          }}
        >
          Vai allo spot →
        </Link>
      )}
    </div>
  );
}

export default function HomePromoSection({ promos }: { promos: ActivePromoCard[] }) {
  // Countdown: decrement every 60s
  const [minsMap, setMinsMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(promos.map((p) => [p.id, p.minutesRemaining]))
  );

  useEffect(() => {
    if (promos.length === 0) return;
    const interval = setInterval(() => {
      setMinsMap((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([id, m]) => [id, Math.max(0, m - 1)])
        )
      );
    }, 60_000);
    return () => clearInterval(interval);
  }, [promos.length]);

  // Nascondi se tutte le promo sono scadute
  const visible = promos.filter((p) => (minsMap[p.id] ?? 0) > 0);
  if (visible.length === 0) return null;

  // Ordina per urgenza (minuti rimanenti crescente)
  const sorted = [...visible].sort(
    (a, b) => (minsMap[a.id] ?? 0) - (minsMap[b.id] ?? 0)
  );

  return (
    <div
      style={{
        borderRadius: 22,
        background: "linear-gradient(135deg, rgba(251,146,60,0.10), rgba(239,68,68,0.06))",
        border: "2px solid rgba(251,146,60,0.3)",
        padding: "16px 20px",
        marginBottom: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 950,
              fontSize: 18,
              letterSpacing: -0.2,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🔥 Promo del momento
          </div>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
            {visible.length === 1
              ? "1 promozione attiva adesso"
              : `${visible.length} promozioni attive adesso`}
          </p>
        </div>
      </div>

      {/* Scroll orizzontale cards */}
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 6,
          scrollbarWidth: "none",
        }}
      >
        {sorted.map((p) => (
          <PromoCard
            key={p.id}
            card={{ ...p, mins: minsMap[p.id] ?? 0 }}
          />
        ))}
      </div>
    </div>
  );
}
