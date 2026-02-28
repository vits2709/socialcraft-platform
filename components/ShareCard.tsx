"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShareCardType = "badge" | "ranking" | "prize" | "streak" | "mission";
export type ShareCardFormat = "square" | "story";

export interface ShareCardData {
  username: string;
  avatarEmoji?: string | null;
  profileColor?: string | null;
  badgeIcon?: string;
  badgeName?: string;
  badgeRarity?: "common" | "rare" | "epic" | "legendary";
  badgeUnlockedAt?: string | null;
  rankPosition?: number;
  rankPoints?: number;
  rankCity?: string;
  prizeName?: string;
  prizeSpot?: string;
  streakDays?: number;
  missionIcon?: string;
  missionName?: string;
  missionPoints?: number;
}

// ─── Rarity config ────────────────────────────────────────────────────────────

const RARITY: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  common:    { label: "Comune",      color: "#93c5fd", bg: "rgba(59,130,246,0.12)",  ring: "rgba(59,130,246,0.3)" },
  rare:      { label: "Raro",        color: "#c4b5fd", bg: "rgba(124,58,237,0.12)", ring: "rgba(124,58,237,0.3)" },
  epic:      { label: "Epico",       color: "#fdba74", bg: "rgba(234,88,12,0.12)",  ring: "rgba(234,88,12,0.3)" },
  legendary: { label: "Leggendario", color: "#fde68a", bg: "rgba(217,119,6,0.14)",  ring: "rgba(251,191,36,0.4)" },
};

// ─── Shared background layers ─────────────────────────────────────────────────

/**
 * NOTE: html2canvas cannot render WebkitBackgroundClip:"text" gradient text.
 * All text uses solid colors. Gradients only on background divs.
 */
function CardBg({
  base,
  blob1,
  blob2,
  accent,
}: {
  base: string;
  blob1: string;
  blob2: string;
  accent: string;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Base gradient */}
      <div style={{ position: "absolute", inset: 0, background: base }} />

      {/* Blob top-left */}
      <div
        style={{
          position: "absolute",
          top: -160,
          left: -160,
          width: 680,
          height: 680,
          borderRadius: "50%",
          background: blob1,
          filter: "blur(90px)",
        }}
      />
      {/* Blob bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: -120,
          right: -120,
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: blob2,
          filter: "blur(110px)",
        }}
      />

      {/* Horizontal accent bar top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: accent,
        }}
      />

      {/* Corner dots — top right */}
      {[0, 1, 2].map((col) =>
        [0, 1, 2].map((row) => (
          <div
            key={`${col}-${row}`}
            style={{
              position: "absolute",
              top: 38 + row * 18,
              right: 38 + col * 18,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
            }}
          />
        ))
      )}

      {/* Bottom-left corner bracket */}
      <div
        style={{
          position: "absolute",
          bottom: 190,
          left: 48,
          width: 40,
          height: 40,
          borderLeft: "2px solid rgba(255,255,255,0.12)",
          borderBottom: "2px solid rgba(255,255,255,0.12)",
          borderRadius: "0 0 0 8px",
        }}
      />
      {/* Top-right corner bracket */}
      <div
        style={{
          position: "absolute",
          top: 120,
          right: 48,
          width: 40,
          height: 40,
          borderRight: "2px solid rgba(255,255,255,0.12)",
          borderTop: "2px solid rgba(255,255,255,0.12)",
          borderRadius: "0 8px 0 0",
        }}
      />

      {/* Separator line above footer */}
      <div
        style={{
          position: "absolute",
          bottom: 172,
          left: 80,
          right: 80,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
        }}
      />
    </div>
  );
}

function GlowRings({
  color,
  size = 320,
}: {
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {[1, 0.65, 0.4].map((scale, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: size * scale,
            height: size * scale,
            borderRadius: "50%",
            border: `1px solid ${color}`,
            opacity: 0.3 - i * 0.06,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          width: size * 0.38,
          height: size * 0.38,
          borderRadius: "50%",
          background: color,
          opacity: 0.06,
          filter: "blur(20px)",
        }}
      />
    </div>
  );
}

function CardLogo({ isStory }: { isStory: boolean }) {
  const sz = isStory ? 44 : 24;
  const fs = isStory ? 46 : 24;
  const pad = isStory ? "18px 44px" : "10px 26px";
  const gap = isStory ? 16 : 9;
  return (
    <div
      style={{
        position: "absolute",
        top: isStory ? 90 : 52,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 999,
          padding: pad,
        }}
      >
        <span style={{ fontSize: sz, lineHeight: 1 }}>🗺️</span>
        <span
          style={{
            fontWeight: 900,
            fontSize: fs,
            letterSpacing: -0.5,
            color: "#fff",
          }}
        >
          CityQuest
        </span>
      </div>
    </div>
  );
}

function CardFooter({
  data,
  isStory,
}: {
  data: ShareCardData;
  isStory: boolean;
}) {
  const color = data.profileColor ?? "#2D1B69";
  const avatarSize = isStory ? 72 : 42;
  const avatarFs = isStory ? 38 : 22;
  const nameFs = isStory ? 50 : 28;
  const domainFs = isStory ? 34 : 19;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: isStory ? 168 : 168,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isStory ? "0 80px" : "0 60px",
        zIndex: 4,
      }}
    >
      {/* User */}
      <div style={{ display: "flex", alignItems: "center", gap: isStory ? 22 : 14 }}>
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: "50%",
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: avatarFs,
            border: "2px solid rgba(255,255,255,0.25)",
            flexShrink: 0,
          }}
        >
          {data.avatarEmoji ?? "👤"}
        </div>
        <div style={{ fontWeight: 800, fontSize: nameFs, color: "#fff", letterSpacing: -0.5 }}>
          @{data.username}
        </div>
      </div>

      {/* Domain */}
      <div
        style={{
          fontSize: domainFs,
          color: "rgba(255,255,255,0.32)",
          fontWeight: 500,
          letterSpacing: 0.5,
        }}
      >
        cityquest.it
      </div>
    </div>
  );
}

// ─── Card: Ranking ────────────────────────────────────────────────────────────

function CardRanking({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const h = isStory ? 1920 : 1080;
  const pos = data.rankPosition ?? 1;
  const ringColor = pos === 1 ? "rgba(251,191,36,0.5)" : pos === 2 ? "rgba(226,232,240,0.4)" : "rgba(180,83,9,0.4)";
  const numColor = pos === 1 ? "#fde68a" : pos === 2 ? "#e2e8f0" : "#fdba74";
  const ringSize = isStory ? 680 : 440;

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: 1080,
        height: h,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        overflow: "hidden",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      <CardBg
        base="linear-gradient(155deg, #0a0714 0%, #0d1a10 100%)"
        blob1="rgba(45,27,105,0.55)"
        blob2="rgba(30,70,20,0.55)"
        accent="linear-gradient(90deg, #2D1B69, #7BC043)"
      />
      <CardLogo isStory={isStory} />

      {/* Center content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 52 : 28,
          textAlign: "center",
          marginTop: isStory ? -60 : -30,
        }}
      >
        {/* Glow rings + number */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: ringSize,
            height: ringSize * 0.72,
          }}
        >
          <GlowRings color={ringColor} size={ringSize * 0.85} />
          <div
            style={{
              position: "relative",
              fontSize: isStory ? 340 : 220,
              fontWeight: 900,
              letterSpacing: -8,
              lineHeight: 1,
              color: numColor,
              zIndex: 2,
              textShadow: `0 0 80px ${ringColor}, 0 0 120px ${ringColor}`,
            }}
          >
            #{pos}
          </div>
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: isStory ? 50 : 32,
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          in classifica questa settimana
        </div>

        {/* Points pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isStory ? 16 : 10,
            background: "rgba(123,192,67,0.14)",
            border: "1.5px solid rgba(123,192,67,0.45)",
            borderRadius: 999,
            padding: isStory ? "22px 56px" : "14px 36px",
          }}
        >
          <span style={{ fontSize: isStory ? 44 : 26 }}>⭐</span>
          <span
            style={{
              fontSize: isStory ? 56 : 36,
              fontWeight: 900,
              color: "#7BC043",
            }}
          >
            {(data.rankPoints ?? 0).toLocaleString("it-IT")} punti
          </span>
        </div>

        {data.rankCity && (
          <div style={{ fontSize: isStory ? 40 : 24, color: "rgba(255,255,255,0.42)", fontWeight: 500 }}>
            📍 {data.rankCity}
          </div>
        )}
      </div>

      <CardFooter data={data} isStory={isStory} />
    </div>
  );
}

// ─── Card: Badge ──────────────────────────────────────────────────────────────

function CardBadge({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const h = isStory ? 1920 : 1080;
  const rc = RARITY[data.badgeRarity ?? "common"];
  const emojiSize = isStory ? 200 : 140;
  const ringSize = isStory ? 500 : 340;

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: 1080,
        height: h,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        overflow: "hidden",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      <CardBg
        base="linear-gradient(155deg, #0a0714 0%, #0f0a20 100%)"
        blob1="rgba(45,27,105,0.6)"
        blob2={`${rc.ring.replace("0.3", "0.25")}`}
        accent={`linear-gradient(90deg, #2D1B69, ${rc.color})`}
      />
      <CardLogo isStory={isStory} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 44 : 24,
          textAlign: "center",
          padding: isStory ? "0 100px" : "0 80px",
          marginTop: isStory ? -60 : -20,
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: isStory ? 36 : 22,
            fontWeight: 600,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Ho sbloccato
        </div>

        {/* Emoji + rings */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: ringSize,
            height: ringSize,
          }}
        >
          <GlowRings color={rc.ring} size={ringSize} />
          {/* Rarity bg disc */}
          <div
            style={{
              position: "absolute",
              width: ringSize * 0.52,
              height: ringSize * 0.52,
              borderRadius: "50%",
              background: rc.bg,
              border: `2px solid ${rc.ring}`,
            }}
          />
          <span
            style={{
              position: "relative",
              fontSize: emojiSize,
              lineHeight: 1,
              zIndex: 2,
            }}
          >
            {data.badgeIcon ?? "🏅"}
          </span>
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: isStory ? 82 : 58,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.05,
            color: "#fff",
          }}
        >
          {data.badgeName ?? "Badge"}
        </div>

        {/* Rarity pill */}
        <div
          style={{
            background: rc.bg,
            border: `1.5px solid ${rc.ring}`,
            borderRadius: 999,
            padding: isStory ? "18px 48px" : "12px 30px",
            fontSize: isStory ? 40 : 26,
            fontWeight: 800,
            color: rc.color,
            letterSpacing: 0.5,
          }}
        >
          {rc.label}
        </div>

        {data.badgeUnlockedAt && (
          <div style={{ fontSize: isStory ? 34 : 20, color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>
            {new Date(data.badgeUnlockedAt).toLocaleDateString("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}
      </div>

      <CardFooter data={data} isStory={isStory} />
    </div>
  );
}

// ─── Card: Prize ──────────────────────────────────────────────────────────────

function CardPrize({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const h = isStory ? 1920 : 1080;

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: 1080,
        height: h,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        overflow: "hidden",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      <CardBg
        base="linear-gradient(155deg, #0f0800 0%, #0a0714 100%)"
        blob1="rgba(120,53,15,0.45)"
        blob2="rgba(45,27,105,0.5)"
        accent="linear-gradient(90deg, #92400e, #fbbf24)"
      />
      <CardLogo isStory={isStory} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 44 : 22,
          textAlign: "center",
          padding: isStory ? "0 100px" : "0 80px",
          marginTop: isStory ? -60 : -20,
        }}
      >
        {/* Trophy + rings */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: isStory ? 420 : 280,
            height: isStory ? 420 : 280,
          }}
        >
          <GlowRings color="rgba(251,191,36,0.45)" size={isStory ? 400 : 260} />
          <div
            style={{
              position: "absolute",
              width: isStory ? 220 : 148,
              height: isStory ? 220 : 148,
              borderRadius: "50%",
              background: "rgba(217,119,6,0.15)",
              border: "2px solid rgba(251,191,36,0.35)",
            }}
          />
          <span
            style={{
              position: "relative",
              fontSize: isStory ? 160 : 110,
              lineHeight: 1,
              zIndex: 2,
            }}
          >
            🏆
          </span>
        </div>

        <div
          style={{
            fontSize: isStory ? 78 : 54,
            fontWeight: 900,
            letterSpacing: -2,
            color: "#fde68a",
            textShadow: "0 0 60px rgba(251,191,36,0.4)",
          }}
        >
          Ho vinto!
        </div>

        <div
          style={{
            fontSize: isStory ? 64 : 44,
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1.1,
            color: "#fff",
            maxWidth: isStory ? 860 : 900,
          }}
        >
          {data.prizeName ?? "Un premio speciale"}
        </div>

        {data.prizeSpot && (
          <div
            style={{
              fontSize: isStory ? 42 : 28,
              color: "rgba(253,230,138,0.7)",
              fontWeight: 600,
            }}
          >
            da {data.prizeSpot}
          </div>
        )}
      </div>

      <CardFooter data={data} isStory={isStory} />
    </div>
  );
}

// ─── Card: Streak ─────────────────────────────────────────────────────────────

function CardStreak({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const h = isStory ? 1920 : 1080;
  const days = data.streakDays ?? 1;

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: 1080,
        height: h,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        overflow: "hidden",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      <CardBg
        base="linear-gradient(155deg, #0f0400 0%, #0a0714 100%)"
        blob1="rgba(124,45,18,0.5)"
        blob2="rgba(45,27,105,0.45)"
        accent="linear-gradient(90deg, #c2410c, #f97316)"
      />
      <CardLogo isStory={isStory} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 40 : 20,
          textAlign: "center",
          marginTop: isStory ? -60 : -20,
        }}
      >
        {/* Fire emoji */}
        <span
          style={{
            fontSize: isStory ? 160 : 100,
            lineHeight: 1,
            filter: "drop-shadow(0 0 40px rgba(249,115,22,0.8))",
          }}
        >
          🔥
        </span>

        {/* Number */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: isStory ? 640 : 420,
            height: isStory ? 380 : 250,
          }}
        >
          <GlowRings color="rgba(249,115,22,0.4)" size={isStory ? 560 : 360} />
          <div
            style={{
              position: "relative",
              fontSize: isStory ? 310 : 200,
              fontWeight: 900,
              letterSpacing: -10,
              lineHeight: 1,
              color: "#fdba74",
              textShadow: "0 0 80px rgba(249,115,22,0.6), 0 0 40px rgba(249,115,22,0.4)",
              zIndex: 2,
            }}
          >
            {days}
          </div>
        </div>

        <div
          style={{
            fontSize: isStory ? 54 : 34,
            fontWeight: 700,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: 0.5,
          }}
        >
          giorni di fila su CityQuest!
        </div>

        {/* "streak attiva" pill */}
        <div
          style={{
            background: "rgba(249,115,22,0.12)",
            border: "1.5px solid rgba(249,115,22,0.4)",
            borderRadius: 999,
            padding: isStory ? "16px 44px" : "10px 28px",
            fontSize: isStory ? 38 : 24,
            fontWeight: 700,
            color: "#fdba74",
          }}
        >
          🔥 Streak attiva
        </div>
      </div>

      <CardFooter data={data} isStory={isStory} />
    </div>
  );
}

// ─── Card: Mission ────────────────────────────────────────────────────────────

function CardMission({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const h = isStory ? 1920 : 1080;

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: 1080,
        height: h,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        overflow: "hidden",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      <CardBg
        base="linear-gradient(155deg, #020d08 0%, #0a0714 100%)"
        blob1="rgba(20,83,45,0.45)"
        blob2="rgba(45,27,105,0.5)"
        accent="linear-gradient(90deg, #166534, #7BC043)"
      />
      <CardLogo isStory={isStory} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 44 : 22,
          textAlign: "center",
          padding: isStory ? "0 100px" : "0 80px",
          marginTop: isStory ? -60 : -20,
        }}
      >
        {/* Mission emoji + rings */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: isStory ? 380 : 260,
            height: isStory ? 380 : 260,
          }}
        >
          <GlowRings color="rgba(123,192,67,0.4)" size={isStory ? 360 : 240} />
          <div
            style={{
              position: "absolute",
              width: isStory ? 200 : 136,
              height: isStory ? 200 : 136,
              borderRadius: "50%",
              background: "rgba(20,83,45,0.3)",
              border: "2px solid rgba(123,192,67,0.3)",
            }}
          />
          <span style={{ position: "relative", fontSize: isStory ? 150 : 100, lineHeight: 1, zIndex: 2 }}>
            {data.missionIcon ?? "🎯"}
          </span>
        </div>

        <div
          style={{
            fontSize: isStory ? 38 : 24,
            fontWeight: 700,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Missione completata!
        </div>

        <div
          style={{
            fontSize: isStory ? 76 : 52,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.1,
            color: "#fff",
          }}
        >
          {data.missionName ?? "Missione"}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isStory ? 16 : 10,
            background: "rgba(123,192,67,0.14)",
            border: "1.5px solid rgba(123,192,67,0.4)",
            borderRadius: 999,
            padding: isStory ? "20px 52px" : "12px 32px",
          }}
        >
          <span style={{ fontSize: isStory ? 40 : 24 }}>✨</span>
          <span style={{ fontSize: isStory ? 54 : 34, fontWeight: 900, color: "#7BC043" }}>
            +{data.missionPoints ?? 0} punti
          </span>
        </div>
      </div>

      <CardFooter data={data} isStory={isStory} />
    </div>
  );
}

// ─── Image generation ─────────────────────────────────────────────────────────

async function generateCardImage(elementId: string, format: ShareCardFormat): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Card element not found");

  const canvas = await html2canvas(element, {
    width: 1080,
    height: format === "story" ? 1920 : 1080,
    scale: 1,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
  });

  return canvas.toDataURL("image/png");
}

// ─── Format icon (CSS-drawn, no SVG) ─────────────────────────────────────────

function FormatIcon({ format, active }: { format: ShareCardFormat; active: boolean }) {
  const color = active ? "#2D1B69" : "rgba(0,0,0,0.3)";
  if (format === "square") {
    return (
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          border: `2px solid ${color}`,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 13,
        height: 20,
        borderRadius: 3,
        border: `2px solid ${color}`,
        flexShrink: 0,
      }}
    />
  );
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

interface ShareModalProps {
  type: ShareCardType;
  data: ShareCardData;
  onClose: () => void;
}

export function ShareModal({ type, data, onClose }: ShareModalProps) {
  const [format, setFormat] = useState<ShareCardFormat>("square");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const cardId = `share-card-${type}-${format}`;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const generate = async () => {
      setGenerating(true);
      setPreviewUrl(null);
      try {
        await new Promise((r) => setTimeout(r, 100));
        if (cancelled) return;
        const url = await generateCardImage(cardId, format);
        if (!cancelled) setPreviewUrl(url);
      } catch (e) {
        console.error("Share card generation failed:", e);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    };

    generate();
    return () => { cancelled = true; };
  }, [format, mounted, cardId]);

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `cityquest-${type}-${format}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!previewUrl) return;
    if (navigator.share && navigator.canShare) {
      try {
        const res = await fetch(previewUrl);
        const blob = await res.blob();
        const file = new File([blob], `cityquest-${type}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "CityQuest",
            text: "Guarda il mio risultato su CityQuest! 🗺️",
          });
          return;
        }
      } catch { /* fallback */ }
    }
    handleDownload();
  };

  if (!mounted) return null;

  const CardComponent = cardComponentFor(type);
  const canAct = !!previewUrl && !generating;

  return createPortal(
    <>
      {/* Hidden card for capture */}
      <div aria-hidden="true" style={{ pointerEvents: "none", userSelect: "none" }}>
        <CardComponent data={data} format={format} id={cardId} />
      </div>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5,3,15,0.72)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 9000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        {/* Modal card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 32px 80px rgba(0,0,0,0.40), 0 0 0 1px rgba(0,0,0,0.06)",
            maxWidth: 400,
            width: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Gradient top bar */}
          <div
            style={{
              height: 5,
              background: "linear-gradient(90deg, #2D1B69, #7BC043)",
              flexShrink: 0,
            }}
          />

          <div style={{ padding: "20px 20px 24px", display: "grid", gap: 18 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: -0.3 }}>
                  Condividi il risultato
                </div>
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", marginTop: 3, fontWeight: 500 }}>
                  Scegli il formato e scarica la card
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Chiudi"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(0,0,0,0.1)",
                  background: "rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(0,0,0,0.5)",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                ✕
              </button>
            </div>

            {/* Format toggle */}
            <div
              style={{
                display: "flex",
                gap: 0,
                background: "rgba(0,0,0,0.045)",
                borderRadius: 12,
                padding: 3,
              }}
            >
              {(["square", "story"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: format === f ? "#fff" : "transparent",
                    boxShadow: format === f ? "0 1px 6px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)" : "none",
                    color: format === f ? "#2D1B69" : "rgba(0,0,0,0.38)",
                    transition: "all 180ms cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  <FormatIcon format={f} active={format === f} />
                  {f === "square" ? "Feed" : "Story"}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                background: "linear-gradient(145deg, #0f0c1a, #0a1208)",
                aspectRatio: format === "square" ? "1 / 1" : "9 / 16",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              {generating && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "3px solid rgba(123,192,67,0.2)",
                      borderTopColor: "#7BC043",
                      margin: "0 auto 10px",
                      animation: "shareCardSpin 0.7s linear infinite",
                    }}
                  />
                  <style>{`@keyframes shareCardSpin { to { transform: rotate(360deg); } }`}</style>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                    Generazione…
                  </div>
                </div>
              )}
              {previewUrl && !generating && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Anteprima card"
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              )}
            </div>

            {/* Hint */}
            {canAct && (
              <div style={{ textAlign: "center", fontSize: 11, color: "rgba(0,0,0,0.35)", fontWeight: 500, marginTop: -6 }}>
                Immagine {format === "square" ? "1080 × 1080 px" : "1080 × 1920 px"} · PNG
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 8 }}>
              <button
                onClick={handleDownload}
                disabled={!canAct}
                style={{
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "1.5px solid rgba(0,0,0,0.1)",
                  background: canAct ? "#fff" : "rgba(0,0,0,0.03)",
                  cursor: canAct ? "pointer" : "not-allowed",
                  fontWeight: 700,
                  fontSize: 14,
                  color: canAct ? "#0f172a" : "rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 160ms",
                  boxShadow: canAct ? "0 2px 8px rgba(0,0,0,0.07)" : "none",
                }}
              >
                ⬇️ Scarica
              </button>
              <button
                onClick={handleShare}
                disabled={!canAct}
                style={{
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: canAct
                    ? "linear-gradient(90deg, #2D1B69, #7BC043)"
                    : "rgba(0,0,0,0.06)",
                  cursor: canAct ? "pointer" : "not-allowed",
                  fontWeight: 800,
                  fontSize: 14,
                  color: canAct ? "#fff" : "rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "opacity 160ms",
                  opacity: canAct ? 1 : 0.5,
                  boxShadow: canAct ? "0 4px 16px rgba(45,27,105,0.35)" : "none",
                }}
              >
                📤 Condividi
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function cardComponentFor(type: ShareCardType) {
  switch (type) {
    case "badge":   return CardBadge;
    case "ranking": return CardRanking;
    case "prize":   return CardPrize;
    case "streak":  return CardStreak;
    case "mission": return CardMission;
  }
}

// ─── ShareButton ──────────────────────────────────────────────────────────────

interface ShareButtonProps {
  type: ShareCardType;
  data: ShareCardData;
  label?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function ShareButton({ type, data, label, style, className }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? "btn"} style={style}>
        {label ?? "📸 Condividi"}
      </button>
      {open && <ShareModal type={type} data={data} onClose={() => setOpen(false)} />}
    </>
  );
}
