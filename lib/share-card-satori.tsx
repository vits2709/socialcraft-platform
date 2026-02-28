// Satori-compatible card JSX for server-side rendering.
// Rules: all elements need display:'flex', no textShadow, no filter:blur, no WebkitBackgroundClip.
// Absolute positioning uses explicit top/left/width/height in pixels.

import React from "react";
import { ShareCardType, ShareCardFormat, ShareCardData, RARITY } from "./share-card-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CardBg({ bg, accentGrad }: { bg: string; accentGrad: string }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Main background with radial blobs */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: bg, display: "flex" }} />
      {/* Top accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accentGrad, display: "flex" }} />
      {/* Dot grid top-right */}
      {[0, 1, 2].flatMap((col) =>
        [0, 1, 2].map((row) => (
          <div
            key={`dot-${col}-${row}`}
            style={{
              position: "absolute",
              top: 40 + row * 20,
              right: 40 + col * 20,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              display: "flex",
            }}
          />
        ))
      )}
      {/* Corner bracket bottom-left */}
      <div style={{
        position: "absolute", bottom: 200, left: 52,
        width: 36, height: 36,
        borderLeft: "2px solid rgba(255,255,255,0.12)",
        borderBottom: "2px solid rgba(255,255,255,0.12)",
        borderRadius: "0 0 0 6px",
        display: "flex",
      }} />
      {/* Corner bracket top-right */}
      <div style={{
        position: "absolute", top: 126, right: 52,
        width: 36, height: 36,
        borderRight: "2px solid rgba(255,255,255,0.12)",
        borderTop: "2px solid rgba(255,255,255,0.12)",
        borderRadius: "0 6px 0 0",
        display: "flex",
      }} />
    </div>
  );
}

/**
 * Concentric glow rings centered in a container of known dimensions.
 * Uses explicit top/left calculations to avoid transform-based centering issues.
 */
function GlowRings({ color, size, containerW, containerH }: {
  color: string;
  size: number;
  containerW: number;
  containerH: number;
}) {
  const cx = containerW / 2;
  const cy = containerH / 2;
  const rings = [
    { s: size,        opacity: 0.35, shadow: true },
    { s: size * 0.67, opacity: 0.22, shadow: false },
    { s: size * 0.40, opacity: 0.14, shadow: false },
  ];
  return (
    <>
      {rings.map(({ s, opacity, shadow }, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: s,
            height: s,
            top: cy - s / 2,
            left: cx - s / 2,
            borderRadius: "50%",
            border: `1.5px solid ${color}`,
            opacity,
            boxShadow: shadow ? `0 0 32px ${color}, inset 0 0 32px ${color}` : undefined,
            display: "flex",
          }}
        />
      ))}
    </>
  );
}

function LogoPill({ isStory }: { isStory: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: isStory ? 16 : 9,
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 999,
      padding: isStory ? "18px 44px" : "10px 26px",
    }}>
      <span style={{ fontSize: isStory ? 40 : 22, lineHeight: 1 }}>🗺️</span>
      <span style={{ fontWeight: 900, fontSize: isStory ? 44 : 24, letterSpacing: -0.5, color: "#fff" }}>
        CityQuest
      </span>
    </div>
  );
}

function CardShell({
  format,
  bg,
  logoH,
  footerH,
  children,
  data,
  contentGap,
  contentPad,
}: {
  format: ShareCardFormat;
  bg: React.ReactNode;
  logoH: number;
  footerH: number;
  children: React.ReactNode;
  data: ShareCardData;
  contentGap?: number;
  contentPad?: string;
}) {
  const isStory = format === "story";
  const h = isStory ? 1920 : 1080;
  const color = data.profileColor ?? "#2D1B69";
  const avatarSz = isStory ? 68 : 40;
  const avatarFs = isStory ? 34 : 20;
  const nameFs = isStory ? 46 : 26;
  const domainFs = isStory ? 30 : 17;

  return (
    <div style={{
      width: 1080,
      height: h,
      display: "flex",
      flexDirection: "column",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      overflow: "hidden",
      color: "#fff",
      position: "relative",
    }}>
      {bg}

      {/* Logo row */}
      <div style={{
        height: logoH,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 4,
      }}>
        <LogoPill isStory={isStory} />
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: contentGap ?? (isStory ? 44 : 24),
        padding: contentPad ?? (isStory ? "0 100px" : "0 80px"),
        position: "relative",
        zIndex: 2,
        textAlign: "center",
        minHeight: 0,
      }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{
        height: footerH,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isStory ? "0 80px" : "0 60px",
        position: "relative",
        zIndex: 4,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isStory ? 20 : 12 }}>
          <div style={{
            width: avatarSz,
            height: avatarSz,
            borderRadius: "50%",
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: avatarFs,
            border: "2px solid rgba(255,255,255,0.22)",
            flexShrink: 0,
          }}>
            {data.avatarEmoji ?? "👤"}
          </div>
          <div style={{ fontWeight: 800, fontSize: nameFs, color: "#fff", letterSpacing: -0.4 }}>
            @{data.username}
          </div>
        </div>
        <div style={{ fontSize: domainFs, color: "rgba(255,255,255,0.30)", fontWeight: 500, letterSpacing: 0.4 }}>
          cityquest.it
        </div>
      </div>
    </div>
  );
}

// ─── Card: Ranking ─────────────────────────────────────────────────────────────

function CardRanking({ data, format }: { data: ShareCardData; format: ShareCardFormat }) {
  const isStory = format === "story";
  const pos = data.rankPosition ?? 1;
  const numColor = pos === 1 ? "#fde68a" : pos === 2 ? "#e2e8f0" : "#fdba74";
  const ringColor = pos === 1 ? "rgba(251,191,36,0.55)" : pos === 2 ? "rgba(226,232,240,0.45)" : "rgba(251,146,60,0.5)";
  const numFs = isStory ? 340 : 230;
  const ringSz = isStory ? 560 : 380;
  const logoH = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const containerW = ringSz;
  const containerH = Math.round(ringSz * 0.7);

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH} contentGap={isStory ? 48 : 28}
      bg={
        <CardBg
          bg={`radial-gradient(ellipse 72% 65% at -5% -5%, rgba(45,27,105,0.75), transparent 65%), radial-gradient(ellipse 60% 58% at 105% 105%, rgba(20,70,15,0.70), transparent 65%), linear-gradient(155deg, #050310 0%, #060d04 100%)`}
          accentGrad="linear-gradient(90deg, #2D1B69, #7BC043)"
        />
      }
    >
      {/* Number + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: containerW, height: containerH }}>
        <GlowRings color={ringColor} size={ringSz} containerW={containerW} containerH={containerH} />
        <div style={{
          position: "relative",
          zIndex: 2,
          fontSize: numFs,
          fontWeight: 900,
          letterSpacing: -8,
          lineHeight: 1,
          color: numColor,
        }}>
          #{pos}
        </div>
      </div>

      <div style={{
        fontSize: isStory ? 48 : 30,
        fontWeight: 600,
        color: "rgba(255,255,255,0.6)",
        letterSpacing: 1,
        textTransform: "uppercase",
      }}>
        in classifica questa settimana
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: isStory ? 14 : 9,
        background: "rgba(123,192,67,0.13)",
        border: "1.5px solid rgba(123,192,67,0.42)",
        borderRadius: 999,
        padding: isStory ? "22px 56px" : "14px 36px",
      }}>
        <span style={{ fontSize: isStory ? 42 : 24 }}>⭐</span>
        <span style={{ fontSize: isStory ? 54 : 34, fontWeight: 900, color: "#7BC043" }}>
          {(data.rankPoints ?? 0).toLocaleString("it-IT")} punti
        </span>
      </div>

      {data.rankCity && (
        <div style={{ fontSize: isStory ? 38 : 22, color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>
          📍 {data.rankCity}
        </div>
      )}
    </CardShell>
  );
}

// ─── Card: Badge ───────────────────────────────────────────────────────────────

function CardBadge({ data, format }: { data: ShareCardData; format: ShareCardFormat }) {
  const isStory = format === "story";
  const rc = RARITY[data.badgeRarity ?? "common"];
  const ringSz = isStory ? 460 : 310;
  const emojiFs = isStory ? 196 : 148;
  const logoH = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const discSz = Math.round(ringSz * 0.52);
  const discOffset = (ringSz - discSz) / 2;

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH} contentGap={isStory ? 40 : 18}
      bg={
        <CardBg
          bg={`radial-gradient(ellipse 70% 64% at -5% -5%, rgba(45,27,105,0.80), transparent 65%), radial-gradient(ellipse 55% 55% at 105% 105%, ${rc.ring.replace(/[\d.]+\)$/, "0.30)")}, transparent 65%), linear-gradient(155deg, #07031a 0%, #0b0920 100%)`}
          accentGrad={`linear-gradient(90deg, #2D1B69, ${rc.color})`}
        />
      }
    >
      <div style={{ fontSize: isStory ? 34 : 20, fontWeight: 600, color: "rgba(255,255,255,0.50)", letterSpacing: 3, textTransform: "uppercase" }}>
        Ho sbloccato
      </div>

      {/* Emoji + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz }}>
        <GlowRings color={rc.ring} size={ringSz} containerW={ringSz} containerH={ringSz} />
        {/* Rarity disc */}
        <div style={{
          position: "absolute",
          width: discSz,
          height: discSz,
          top: discOffset,
          left: discOffset,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${rc.ring.replace(/[\d.]+\)$/, "0.22)")}, transparent 80%)`,
          border: `2px solid ${rc.ring}`,
          boxShadow: `0 0 24px ${rc.ring}`,
          display: "flex",
        }} />
        <span style={{ position: "relative", zIndex: 2, fontSize: emojiFs, lineHeight: 1 }}>
          {data.badgeIcon ?? "🏅"}
        </span>
      </div>

      <div style={{ fontSize: isStory ? 80 : 56, fontWeight: 900, letterSpacing: -2, lineHeight: 1.05, color: "#fff" }}>
        {data.badgeName ?? "Badge"}
      </div>

      <div style={{
        background: rc.bg,
        border: `1.5px solid ${rc.ring}`,
        borderRadius: 999,
        padding: isStory ? "18px 48px" : "11px 30px",
        fontSize: isStory ? 40 : 26,
        fontWeight: 800,
        color: rc.color,
        letterSpacing: 0.5,
      }}>
        {rc.label}
      </div>

      {data.badgeUnlockedAt && (
        <div style={{ fontSize: isStory ? 32 : 18, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
          {new Date(data.badgeUnlockedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      )}
    </CardShell>
  );
}

// ─── Card: Prize ───────────────────────────────────────────────────────────────

function CardPrize({ data, format }: { data: ShareCardData; format: ShareCardFormat }) {
  const isStory = format === "story";
  const ringSz = isStory ? 400 : 280;
  const emojiFs = isStory ? 164 : 124;
  const logoH = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const discSz = Math.round(ringSz * 0.52);
  const discOffset = (ringSz - discSz) / 2;

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH} contentGap={isStory ? 44 : 22}
      bg={
        <CardBg
          bg={`radial-gradient(ellipse 68% 62% at -5% -5%, rgba(120,53,15,0.75), transparent 65%), radial-gradient(ellipse 55% 55% at 105% 105%, rgba(45,27,105,0.60), transparent 65%), linear-gradient(155deg, #0d0500 0%, #07031a 100%)`}
          accentGrad="linear-gradient(90deg, #92400e, #fbbf24)"
        />
      }
    >
      {/* Trophy + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz }}>
        <GlowRings color="rgba(251,191,36,0.48)" size={ringSz} containerW={ringSz} containerH={ringSz} />
        <div style={{
          position: "absolute",
          width: discSz,
          height: discSz,
          top: discOffset,
          left: discOffset,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(251,191,36,0.18), transparent 80%)",
          border: "2px solid rgba(251,191,36,0.40)",
          boxShadow: "0 0 24px rgba(251,191,36,0.30)",
          display: "flex",
        }} />
        <span style={{ position: "relative", zIndex: 2, fontSize: emojiFs, lineHeight: 1 }}>🏆</span>
      </div>

      <div style={{ fontSize: isStory ? 76 : 52, fontWeight: 900, letterSpacing: -2, color: "#fde68a" }}>
        Ho vinto!
      </div>

      <div style={{ fontSize: isStory ? 62 : 42, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, color: "#fff", maxWidth: isStory ? 860 : 900 }}>
        {data.prizeName ?? "Un premio speciale"}
      </div>

      {data.prizeSpot && (
        <div style={{ fontSize: isStory ? 40 : 26, color: "rgba(253,230,138,0.65)", fontWeight: 600 }}>
          da {data.prizeSpot}
        </div>
      )}
    </CardShell>
  );
}

// ─── Card: Streak ──────────────────────────────────────────────────────────────

function CardStreak({ data, format }: { data: ShareCardData; format: ShareCardFormat }) {
  const isStory = format === "story";
  const ringSz = isStory ? 520 : 350;
  const numFs = isStory ? 300 : 200;
  const fireFs = isStory ? 140 : 100;
  const logoH = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const containerW = ringSz;
  const containerH = Math.round(ringSz * 0.68);

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH} contentGap={isStory ? 36 : 16}
      bg={
        <CardBg
          bg={`radial-gradient(ellipse 70% 65% at -5% -5%, rgba(140,50,10,0.80), transparent 65%), radial-gradient(ellipse 55% 55% at 105% 105%, rgba(45,27,105,0.58), transparent 65%), linear-gradient(155deg, #0a0200 0%, #07031a 100%)`}
          accentGrad="linear-gradient(90deg, #c2410c, #f97316)"
        />
      }
    >
      <span style={{ fontSize: fireFs, lineHeight: 1 }}>🔥</span>

      {/* Number + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: containerW, height: containerH }}>
        <GlowRings color="rgba(249,115,22,0.42)" size={ringSz} containerW={containerW} containerH={containerH} />
        <div style={{ position: "relative", zIndex: 2, fontSize: numFs, fontWeight: 900, letterSpacing: -8, lineHeight: 1, color: "#fdba74" }}>
          {data.streakDays ?? 1}
        </div>
      </div>

      <div style={{ fontSize: isStory ? 52 : 32, fontWeight: 700, color: "rgba(255,255,255,0.68)" }}>
        giorni di fila su CityQuest!
      </div>

      <div style={{
        background: "rgba(249,115,22,0.11)",
        border: "1.5px solid rgba(249,115,22,0.38)",
        borderRadius: 999,
        padding: isStory ? "16px 44px" : "10px 28px",
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
  const ringSz = isStory ? 380 : 280;
  const emojiFs = isStory ? 160 : 130;
  const logoH = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;
  const discSz = Math.round(ringSz * 0.52);
  const discOffset = (ringSz - discSz) / 2;

  return (
    <CardShell format={format} data={data} logoH={logoH} footerH={footerH} contentGap={isStory ? 40 : 20}
      bg={
        <CardBg
          bg={`radial-gradient(ellipse 68% 62% at -5% -5%, rgba(20,83,45,0.72), transparent 65%), radial-gradient(ellipse 55% 55% at 105% 105%, rgba(45,27,105,0.62), transparent 65%), linear-gradient(155deg, #010a04 0%, #07031a 100%)`}
          accentGrad="linear-gradient(90deg, #166534, #7BC043)"
        />
      }
    >
      {/* Emoji + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz }}>
        <GlowRings color="rgba(123,192,67,0.42)" size={ringSz} containerW={ringSz} containerH={ringSz} />
        <div style={{
          position: "absolute",
          width: discSz,
          height: discSz,
          top: discOffset,
          left: discOffset,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(123,192,67,0.18), transparent 80%)",
          border: "2px solid rgba(123,192,67,0.36)",
          boxShadow: "0 0 24px rgba(123,192,67,0.25)",
          display: "flex",
        }} />
        <span style={{ position: "relative", zIndex: 2, fontSize: emojiFs, lineHeight: 1 }}>
          {data.missionIcon ?? "🎯"}
        </span>
      </div>

      <div style={{ fontSize: isStory ? 36 : 22, fontWeight: 700, color: "rgba(255,255,255,0.48)", letterSpacing: 3, textTransform: "uppercase" }}>
        Missione completata!
      </div>

      <div style={{ fontSize: isStory ? 74 : 50, fontWeight: 900, letterSpacing: -2, lineHeight: 1.1, color: "#fff" }}>
        {data.missionName ?? "Missione"}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: isStory ? 14 : 9,
        background: "rgba(123,192,67,0.13)",
        border: "1.5px solid rgba(123,192,67,0.38)",
        borderRadius: 999,
        padding: isStory ? "20px 52px" : "12px 32px",
      }}>
        <span style={{ fontSize: isStory ? 38 : 22 }}>✨</span>
        <span style={{ fontSize: isStory ? 52 : 32, fontWeight: 900, color: "#7BC043" }}>
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
