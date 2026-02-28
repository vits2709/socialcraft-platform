/**
 * Satori-compatible card JSX.
 *
 * Satori CSS rules:
 *  - NO shorthand: background/border/padding must be fully expanded
 *  - background color  → backgroundColor
 *  - background gradient → backgroundImage
 *  - border: "1px solid red" → borderWidth + borderStyle + borderColor
 *  - padding: "10px 20px" → paddingTop/Bottom/Left/Right individually
 *  - borderRadius multi-value string → individual corner props
 *  - Every element must have display: "flex" explicitly
 *  - inset: 0 → top/left/right/bottom individually
 */

import React from "react";
import { ShareCardType, ShareCardFormat, ShareCardData, RARITY } from "./share-card-types";

// ─── Shorthand helpers ────────────────────────────────────────────────────────

/** Expand a 2-value padding (vertical, horizontal) into individual props */
function pad(v: number, h: number) {
  return { paddingTop: v, paddingBottom: v, paddingLeft: h, paddingRight: h };
}

/** Expand uniform border shorthand into individual props */
function border(width: number, color: string) {
  return { borderWidth: width, borderStyle: "solid" as const, borderColor: color };
}

/** Expand a border on one side */
function borderTop(width: number, color: string) {
  return { borderTopWidth: width, borderTopStyle: "solid" as const, borderTopColor: color };
}
function borderLeft(width: number, color: string) {
  return { borderLeftWidth: width, borderLeftStyle: "solid" as const, borderLeftColor: color };
}
function borderBottom(width: number, color: string) {
  return { borderBottomWidth: width, borderBottomStyle: "solid" as const, borderBottomColor: color };
}
function borderRight(width: number, color: string) {
  return { borderRightWidth: width, borderRightStyle: "solid" as const, borderRightColor: color };
}

// ─── GlowRings ────────────────────────────────────────────────────────────────

/**
 * Three concentric rings centered in a container of known pixel dimensions.
 * Uses explicit top/left calculations — no transform: translate(-50%,-50%).
 */
function GlowRings({ color, size, cw, ch }: { color: string; size: number; cw: number; ch: number }) {
  const rings = [
    { s: size,        opacity: 0.35, glow: true  },
    { s: size * 0.67, opacity: 0.22, glow: false },
    { s: size * 0.40, opacity: 0.14, glow: false },
  ];
  return (
    <>
      {rings.map(({ s, opacity, glow }, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            position: "absolute",
            width: s,
            height: s,
            top: ch / 2 - s / 2,
            left: cw / 2 - s / 2,
            borderRadius: s / 2,
            ...border(2, color),
            opacity,
            boxShadow: glow ? `0 0 40px ${color}, inset 0 0 40px ${color}` : undefined,
          }}
        />
      ))}
    </>
  );
}

// ─── Logo pill ─────────────────────────────────────────────────────────────────

function LogoPill({ isStory }: { isStory: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: isStory ? 16 : 9,
      backgroundColor: "rgba(255,255,255,0.07)",
      ...border(1, "rgba(255,255,255,0.15)"),
      borderRadius: 999,
      ...pad(isStory ? 18 : 10, isStory ? 44 : 26),
    }}>
      <span style={{ fontSize: isStory ? 40 : 22, lineHeight: 1, display: "flex" }}>🗺️</span>
      <span style={{ fontWeight: 900, fontSize: isStory ? 44 : 24, letterSpacing: -0.5, color: "#fff", display: "flex" }}>
        CityQuest
      </span>
    </div>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function CardShell({
  format,
  bg,
  accentGrad,
  logoH,
  footerH,
  children,
  data,
  contentGap,
}: {
  format: ShareCardFormat;
  bg: string;          // multi-stop gradient string for backgroundImage
  accentGrad: string;  // accent stripe gradient for backgroundImage
  logoH: number;
  footerH: number;
  children: React.ReactNode;
  data: ShareCardData;
  contentGap?: number;
}) {
  const isStory = format === "story";
  const W = 1080;
  const H = isStory ? 1920 : 1080;
  const profileColor = data.profileColor ?? "#2D1B69";
  const avatarSz = isStory ? 68 : 40;
  const avatarFs = isStory ? 34 : 20;
  const nameFs   = isStory ? 46 : 26;
  const domainFs = isStory ? 30 : 17;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: W,
      height: H,
      fontFamily: "Inter",
      color: "#fff",
      position: "relative",
      // Dark base color + multi-stop gradient overlay
      backgroundColor: "#060210",
      backgroundImage: bg,
      overflow: "hidden",
    }}>

      {/* ── Accent stripe ── */}
      <div style={{
        display: "flex",
        position: "absolute",
        top: 0, left: 0,
        width: W, height: 5,
        backgroundImage: accentGrad,
      }} />

      {/* ── Dot grid top-right ── */}
      {[0, 1, 2].flatMap((col) =>
        [0, 1, 2].map((row) => (
          <div
            key={`d${col}${row}`}
            style={{
              display: "flex",
              position: "absolute",
              top: 40 + row * 20,
              right: 40 + col * 20,
              width: 4, height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.18)",
            }}
          />
        ))
      )}

      {/* ── Corner bracket bottom-left ── */}
      <div style={{
        display: "flex",
        position: "absolute",
        bottom: 200, left: 52,
        width: 36, height: 36,
        ...borderLeft(2, "rgba(255,255,255,0.12)"),
        ...borderBottom(2, "rgba(255,255,255,0.12)"),
        borderBottomLeftRadius: 6,
      }} />

      {/* ── Corner bracket top-right ── */}
      <div style={{
        display: "flex",
        position: "absolute",
        top: 126, right: 52,
        width: 36, height: 36,
        ...borderRight(2, "rgba(255,255,255,0.12)"),
        ...borderTop(2, "rgba(255,255,255,0.12)"),
        borderTopRightRadius: 6,
      }} />

      {/* ── Logo row ── */}
      <div style={{
        display: "flex",
        height: logoH,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 2,
      }}>
        <LogoPill isStory={isStory} />
      </div>

      {/* ── Content area ── */}
      <div style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: contentGap ?? (isStory ? 44 : 24),
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: isStory ? 100 : 80,
        paddingRight: isStory ? 100 : 80,
        position: "relative",
        zIndex: 2,
        minHeight: 0,
      }}>
        {children}
      </div>

      {/* ── Footer ── */}
      <div style={{
        display: "flex",
        height: footerH,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: isStory ? 80 : 60,
        paddingRight: isStory ? 80 : 60,
        position: "relative",
        zIndex: 2,
        ...borderTop(1, "rgba(255,255,255,0.08)"),
      }}>
        {/* Avatar + username */}
        <div style={{ display: "flex", alignItems: "center", gap: isStory ? 20 : 12 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: avatarSz, height: avatarSz,
            borderRadius: avatarSz / 2,
            backgroundColor: profileColor,
            fontSize: avatarFs,
            ...border(2, "rgba(255,255,255,0.22)"),
            flexShrink: 0,
          }}>
            {data.avatarEmoji ?? "👤"}
          </div>
          <span style={{ display: "flex", fontWeight: 700, fontSize: nameFs, color: "#fff", letterSpacing: -0.4 }}>
            @{data.username}
          </span>
        </div>
        {/* Domain */}
        <span style={{ display: "flex", fontSize: domainFs, color: "rgba(255,255,255,0.30)", fontWeight: 400, letterSpacing: 0.4 }}>
          cityquest.it
        </span>
      </div>
    </div>
  );
}

// ─── Card: Ranking ─────────────────────────────────────────────────────────────

function CardRanking({ data, format }: { data: ShareCardData; format: ShareCardFormat }) {
  const isStory = format === "story";
  const pos = data.rankPosition ?? 1;
  const numColor  = pos === 1 ? "#fde68a" : pos === 2 ? "#e2e8f0" : "#fdba74";
  const ringColor = pos === 1 ? "rgba(251,191,36,0.55)" : pos === 2 ? "rgba(226,232,240,0.45)" : "rgba(251,146,60,0.5)";
  const numFs  = isStory ? 340 : 230;
  const ringSz = isStory ? 560 : 380;
  const logoH  = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const cw = ringSz;
  const ch = Math.round(ringSz * 0.7);

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 48 : 28}
      bg="radial-gradient(ellipse 72% 65% at -5% -5%, rgba(45,27,105,0.75), transparent 65%), radial-gradient(ellipse 60% 58% at 105% 105%, rgba(20,70,15,0.70), transparent 65%), linear-gradient(155deg, #050310 0%, #060d04 100%)"
      accentGrad="linear-gradient(90deg, #2D1B69, #7BC043)"
    >
      {/* Number + rings */}
      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "center", width: cw, height: ch }}>
        <GlowRings color={ringColor} size={ringSz} cw={cw} ch={ch} />
        <span style={{ display: "flex", position: "relative", zIndex: 2, fontSize: numFs, fontWeight: 900, letterSpacing: -8, lineHeight: 1, color: numColor }}>
          #{pos}
        </span>
      </div>

      <span style={{ display: "flex", fontSize: isStory ? 48 : 30, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: 1, textTransform: "uppercase" }}>
        in classifica questa settimana
      </span>

      {/* Points pill */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: isStory ? 14 : 9,
        backgroundColor: "rgba(123,192,67,0.13)",
        ...border(2, "rgba(123,192,67,0.42)"),
        borderRadius: 999,
        ...pad(isStory ? 22 : 14, isStory ? 56 : 36),
      }}>
        <span style={{ display: "flex", fontSize: isStory ? 42 : 24 }}>⭐</span>
        <span style={{ display: "flex", fontSize: isStory ? 54 : 34, fontWeight: 900, color: "#7BC043" }}>
          {(data.rankPoints ?? 0).toLocaleString("it-IT")} punti
        </span>
      </div>

      {data.rankCity && (
        <span style={{ display: "flex", fontSize: isStory ? 38 : 22, color: "rgba(255,255,255,0.38)", fontWeight: 400 }}>
          📍 {data.rankCity}
        </span>
      )}
    </CardShell>
  );
}

// ─── Card: Badge ───────────────────────────────────────────────────────────────

function CardBadge({ data, format }: { data: ShareCardData; format: ShareCardFormat }) {
  const isStory = format === "story";
  const rc = RARITY[data.badgeRarity ?? "common"];
  const ringSz  = isStory ? 460 : 310;
  const emojiFs = isStory ? 196 : 148;
  const logoH   = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const discSz  = Math.round(ringSz * 0.52);
  const discOff = (ringSz - discSz) / 2;
  // Strip alpha from ring color for a softer variant
  const ringAlpha30 = rc.ring.replace(/[\d.]+\)$/, "0.30)");
  const ringAlpha22 = rc.ring.replace(/[\d.]+\)$/, "0.22)");

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 40 : 18}
      bg={`radial-gradient(ellipse 70% 64% at -5% -5%, rgba(45,27,105,0.80), transparent 65%), radial-gradient(ellipse 55% 55% at 105% 105%, ${ringAlpha30}, transparent 65%), linear-gradient(155deg, #07031a 0%, #0b0920 100%)`}
      accentGrad={`linear-gradient(90deg, #2D1B69, ${rc.color})`}
    >
      <span style={{ display: "flex", fontSize: isStory ? 34 : 20, fontWeight: 600, color: "rgba(255,255,255,0.50)", letterSpacing: 3, textTransform: "uppercase" }}>
        Ho sbloccato
      </span>

      {/* Emoji + rings */}
      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz }}>
        <GlowRings color={rc.ring} size={ringSz} cw={ringSz} ch={ringSz} />
        {/* Rarity disc behind emoji */}
        <div style={{
          display: "flex",
          position: "absolute",
          width: discSz, height: discSz,
          top: discOff, left: discOff,
          borderRadius: discSz / 2,
          backgroundImage: `radial-gradient(ellipse at center, ${ringAlpha22}, transparent 80%)`,
          ...border(2, rc.ring),
          boxShadow: `0 0 24px ${rc.ring}`,
        }} />
        <span style={{ display: "flex", position: "relative", zIndex: 2, fontSize: emojiFs, lineHeight: 1 }}>
          {data.badgeIcon ?? "🏅"}
        </span>
      </div>

      <span style={{ display: "flex", fontSize: isStory ? 80 : 56, fontWeight: 900, letterSpacing: -2, lineHeight: 1.05, color: "#fff" }}>
        {data.badgeName ?? "Badge"}
      </span>

      {/* Rarity pill */}
      <div style={{
        display: "flex",
        backgroundColor: rc.bg,
        ...border(2, rc.ring),
        borderRadius: 999,
        ...pad(isStory ? 18 : 11, isStory ? 48 : 30),
        fontSize: isStory ? 40 : 26,
        fontWeight: 900,
        color: rc.color,
        letterSpacing: 0.5,
      }}>
        {rc.label}
      </div>

      {data.badgeUnlockedAt && (
        <span style={{ display: "flex", fontSize: isStory ? 32 : 18, color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>
          {new Date(data.badgeUnlockedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      )}
    </CardShell>
  );
}

// ─── Card: Prize ───────────────────────────────────────────────────────────────

function CardPrize({ data, format }: { data: ShareCardData; format: ShareCardFormat }) {
  const isStory = format === "story";
  const ringSz  = isStory ? 400 : 280;
  const emojiFs = isStory ? 164 : 124;
  const logoH   = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const discSz  = Math.round(ringSz * 0.52);
  const discOff = (ringSz - discSz) / 2;

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 44 : 22}
      bg="radial-gradient(ellipse 68% 62% at -5% -5%, rgba(120,53,15,0.75), transparent 65%), radial-gradient(ellipse 55% 55% at 105% 105%, rgba(45,27,105,0.60), transparent 65%), linear-gradient(155deg, #0d0500 0%, #07031a 100%)"
      accentGrad="linear-gradient(90deg, #92400e, #fbbf24)"
    >
      {/* Trophy + rings */}
      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz }}>
        <GlowRings color="rgba(251,191,36,0.48)" size={ringSz} cw={ringSz} ch={ringSz} />
        <div style={{
          display: "flex",
          position: "absolute",
          width: discSz, height: discSz,
          top: discOff, left: discOff,
          borderRadius: discSz / 2,
          backgroundImage: "radial-gradient(ellipse at center, rgba(251,191,36,0.18), transparent 80%)",
          ...border(2, "rgba(251,191,36,0.40)"),
          boxShadow: "0 0 24px rgba(251,191,36,0.30)",
        }} />
        <span style={{ display: "flex", position: "relative", zIndex: 2, fontSize: emojiFs, lineHeight: 1 }}>🏆</span>
      </div>

      <span style={{ display: "flex", fontSize: isStory ? 76 : 52, fontWeight: 900, letterSpacing: -2, color: "#fde68a" }}>
        Ho vinto!
      </span>

      <span style={{ display: "flex", fontSize: isStory ? 62 : 42, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, color: "#fff", textAlign: "center" }}>
        {data.prizeName ?? "Un premio speciale"}
      </span>

      {data.prizeSpot && (
        <span style={{ display: "flex", fontSize: isStory ? 40 : 26, color: "rgba(253,230,138,0.65)", fontWeight: 600 }}>
          da {data.prizeSpot}
        </span>
      )}
    </CardShell>
  );
}

// ─── Card: Streak ──────────────────────────────────────────────────────────────

function CardStreak({ data, format }: { data: ShareCardData; format: ShareCardFormat }) {
  const isStory = format === "story";
  const ringSz  = isStory ? 520 : 350;
  const numFs   = isStory ? 300 : 200;
  const fireFs  = isStory ? 140 : 100;
  const logoH   = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const cw = ringSz;
  const ch = Math.round(ringSz * 0.68);

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 36 : 16}
      bg="radial-gradient(ellipse 70% 65% at -5% -5%, rgba(140,50,10,0.80), transparent 65%), radial-gradient(ellipse 55% 55% at 105% 105%, rgba(45,27,105,0.58), transparent 65%), linear-gradient(155deg, #0a0200 0%, #07031a 100%)"
      accentGrad="linear-gradient(90deg, #c2410c, #f97316)"
    >
      <span style={{ display: "flex", fontSize: fireFs, lineHeight: 1 }}>🔥</span>

      {/* Number + rings */}
      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "center", width: cw, height: ch }}>
        <GlowRings color="rgba(249,115,22,0.42)" size={ringSz} cw={cw} ch={ch} />
        <span style={{ display: "flex", position: "relative", zIndex: 2, fontSize: numFs, fontWeight: 900, letterSpacing: -8, lineHeight: 1, color: "#fdba74" }}>
          {data.streakDays ?? 1}
        </span>
      </div>

      <span style={{ display: "flex", fontSize: isStory ? 52 : 32, fontWeight: 600, color: "rgba(255,255,255,0.68)" }}>
        giorni di fila su CityQuest!
      </span>

      <div style={{
        display: "flex",
        backgroundColor: "rgba(249,115,22,0.11)",
        ...border(2, "rgba(249,115,22,0.38)"),
        borderRadius: 999,
        ...pad(isStory ? 16 : 10, isStory ? 44 : 28),
        fontSize: isStory ? 38 : 24,
        fontWeight: 700,
        color: "#fdba74",
      }}>
        🔥 Streak attiva
      </div>
    </CardShell>
  );
}

// ─── Card: Mission ─────────────────────────────────────────────────────────────

function CardMission({ data, format }: { data: ShareCardData; format: ShareCardFormat }) {
  const isStory = format === "story";
  const ringSz  = isStory ? 380 : 280;
  const emojiFs = isStory ? 160 : 130;
  const logoH   = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const discSz  = Math.round(ringSz * 0.52);
  const discOff = (ringSz - discSz) / 2;

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 40 : 20}
      bg="radial-gradient(ellipse 68% 62% at -5% -5%, rgba(20,83,45,0.72), transparent 65%), radial-gradient(ellipse 55% 55% at 105% 105%, rgba(45,27,105,0.62), transparent 65%), linear-gradient(155deg, #010a04 0%, #07031a 100%)"
      accentGrad="linear-gradient(90deg, #166534, #7BC043)"
    >
      {/* Emoji + rings */}
      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz }}>
        <GlowRings color="rgba(123,192,67,0.42)" size={ringSz} cw={ringSz} ch={ringSz} />
        <div style={{
          display: "flex",
          position: "absolute",
          width: discSz, height: discSz,
          top: discOff, left: discOff,
          borderRadius: discSz / 2,
          backgroundImage: "radial-gradient(ellipse at center, rgba(123,192,67,0.18), transparent 80%)",
          ...border(2, "rgba(123,192,67,0.36)"),
          boxShadow: "0 0 24px rgba(123,192,67,0.25)",
        }} />
        <span style={{ display: "flex", position: "relative", zIndex: 2, fontSize: emojiFs, lineHeight: 1 }}>
          {data.missionIcon ?? "🎯"}
        </span>
      </div>

      <span style={{ display: "flex", fontSize: isStory ? 36 : 22, fontWeight: 700, color: "rgba(255,255,255,0.48)", letterSpacing: 3, textTransform: "uppercase" }}>
        Missione completata!
      </span>

      <span style={{ display: "flex", fontSize: isStory ? 74 : 50, fontWeight: 900, letterSpacing: -2, lineHeight: 1.1, color: "#fff" }}>
        {data.missionName ?? "Missione"}
      </span>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: isStory ? 14 : 9,
        backgroundColor: "rgba(123,192,67,0.13)",
        ...border(2, "rgba(123,192,67,0.38)"),
        borderRadius: 999,
        ...pad(isStory ? 20 : 12, isStory ? 52 : 32),
      }}>
        <span style={{ display: "flex", fontSize: isStory ? 38 : 22 }}>✨</span>
        <span style={{ display: "flex", fontSize: isStory ? 52 : 32, fontWeight: 900, color: "#7BC043" }}>
          +{data.missionPoints ?? 0} punti
        </span>
      </div>
    </CardShell>
  );
}

// ─── Entry point ───────────────────────────────────────────────────────────────

export function renderShareCard(
  type: ShareCardType,
  data: ShareCardData,
  format: ShareCardFormat
): React.ReactElement {
  switch (type) {
    case "ranking": return <CardRanking data={data} format={format} />;
    case "badge":   return <CardBadge   data={data} format={format} />;
    case "prize":   return <CardPrize   data={data} format={format} />;
    case "streak":  return <CardStreak  data={data} format={format} />;
    case "mission": return <CardMission data={data} format={format} />;
  }
}
