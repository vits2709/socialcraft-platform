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
  common:    { label: "Comune",      color: "#93c5fd", bg: "rgba(59,130,246,0.12)",  ring: "rgba(96,165,250,0.45)" },
  rare:      { label: "Raro",        color: "#c4b5fd", bg: "rgba(124,58,237,0.12)", ring: "rgba(167,139,250,0.45)" },
  epic:      { label: "Epico",       color: "#fdba74", bg: "rgba(234,88,12,0.12)",  ring: "rgba(251,146,60,0.45)" },
  legendary: { label: "Leggendario", color: "#fde68a", bg: "rgba(217,119,6,0.14)",  ring: "rgba(251,191,36,0.55)" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * html2canvas compatibility notes:
 * - NO filter:blur()        → not rendered; use radial-gradient instead
 * - NO WebkitBackgroundClip:"text"  → not rendered; use solid colors
 * - NO backdrop-filter      → not rendered
 * - box-shadow IS rendered  → use for glow effects on bordered elements
 * - radial-gradient IS rendered → use for soft blob backgrounds
 */

/**
 * Background layer.
 * `bg` is a full CSS `background` value — use multi-stop radial-gradients
 * instead of blurred divs (html2canvas does not render filter:blur).
 */
function CardBg({ bg, accentGrad }: { bg: string; accentGrad: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {/* Main background with soft radial blobs baked in */}
      <div style={{ position: "absolute", inset: 0, background: bg }} />
      {/* Top accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accentGrad }} />
      {/* Dot grid — top right */}
      {[0,1,2].flatMap(col => [0,1,2].map(row => (
        <div key={`${col}-${row}`} style={{
          position: "absolute",
          top: 40 + row * 20, right: 40 + col * 20,
          width: 4, height: 4, borderRadius: "50%",
          background: "rgba(255,255,255,0.18)",
        }} />
      )))}
      {/* Corner bracket bottom-left */}
      <div style={{
        position: "absolute", bottom: 200, left: 52,
        width: 36, height: 36,
        borderLeft: "2px solid rgba(255,255,255,0.12)",
        borderBottom: "2px solid rgba(255,255,255,0.12)",
        borderRadius: "0 0 0 6px",
      }} />
      {/* Corner bracket top-right */}
      <div style={{
        position: "absolute", top: 126, right: 52,
        width: 36, height: 36,
        borderRight: "2px solid rgba(255,255,255,0.12)",
        borderTop: "2px solid rgba(255,255,255,0.12)",
        borderRadius: "0 6px 0 0",
      }} />
    </div>
  );
}

/**
 * Concentric glow rings — html2canvas safe.
 * Uses box-shadow (rendered) instead of filter:blur (NOT rendered).
 * Siblings inside a `position:relative` wrapper; self-center via transform.
 */
function GlowRings({ color, size }: { color: string; size: number }) {
  return (
    <>
      {/* Outer ring — box-shadow provides the glow */}
      <div style={{
        position: "absolute",
        width: size, height: size,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: `1.5px solid ${color}`,
        opacity: 0.35,
        boxShadow: `0 0 32px ${color}, inset 0 0 32px ${color}`,
      }} />
      {/* Middle ring */}
      <div style={{
        position: "absolute",
        width: size * 0.67, height: size * 0.67,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: `1.5px solid ${color}`,
        opacity: 0.22,
      }} />
      {/* Inner ring */}
      <div style={{
        position: "absolute",
        width: size * 0.40, height: size * 0.40,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: `1.5px solid ${color}`,
        opacity: 0.14,
      }} />
    </>
  );
}

/** Logo pill — renders as a normal flex child. */
function LogoPill({ isStory }: { isStory: boolean }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center",
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

/**
 * Card outer shell.
 * Layout: logo row (fixed height) | content (flex:1, centered) | footer (fixed height)
 * This guarantees content is always centered in the visual space between logo and footer.
 */
function CardShell({
  id, format, bg,
  logoH, footerH,
  children, data,
  contentGap,
  contentPad,
}: {
  id: string;
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
  const nameFs   = isStory ? 46 : 26;
  const domainFs = isStory ? 30 : 17;

  return (
    <div id={id} style={{
      position: "absolute", left: -9999, top: 0,
      width: 1080, height: h,
      display: "flex", flexDirection: "column",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      overflow: "hidden", color: "#fff", boxSizing: "border-box",
    }}>
      {bg}

      {/* Logo row */}
      <div style={{
        height: logoH, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 4,
      }}>
        <LogoPill isStory={isStory} />
      </div>

      {/* Content area — perfectly centered */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: contentGap ?? (isStory ? 44 : 24),
        padding: contentPad ?? (isStory ? "0 100px" : "0 80px"),
        position: "relative", zIndex: 2,
        textAlign: "center",
        minHeight: 0,
      }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{
        height: footerH, flexShrink: 0,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: isStory ? "0 80px" : "0 60px",
        position: "relative", zIndex: 4,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* user */}
        <div style={{ display: "flex", alignItems: "center", gap: isStory ? 20 : 12 }}>
          <div style={{
            width: avatarSz, height: avatarSz, borderRadius: "50%",
            background: color,
            display: "flex", alignItems: "center", justifyContent: "center",
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
        {/* domain */}
        <div style={{ fontSize: domainFs, color: "rgba(255,255,255,0.30)", fontWeight: 500, letterSpacing: 0.4 }}>
          cityquest.it
        </div>
      </div>
    </div>
  );
}

// ─── Card: Ranking ────────────────────────────────────────────────────────────

function CardRanking({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const pos = data.rankPosition ?? 1;
  const numColor  = pos === 1 ? "#fde68a" : pos === 2 ? "#e2e8f0" : "#fdba74";
  const ringColor = pos === 1 ? "rgba(251,191,36,0.55)" : pos === 2 ? "rgba(226,232,240,0.45)" : "rgba(251,146,60,0.5)";
  const numFs   = isStory ? 340 : 230;
  const ringSz  = isStory ? 560 : 380;
  const logoH   = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;

  return (
    <CardShell id={id} format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 48 : 28}
      bg={
        <CardBg
          bg={`
            radial-gradient(ellipse 72% 65% at -5% -5%, rgba(45,27,105,0.75), transparent 65%),
            radial-gradient(ellipse 60% 58% at 105% 105%, rgba(20,70,15,0.70), transparent 65%),
            linear-gradient(155deg, #050310 0%, #060d04 100%)
          `}
          accentGrad="linear-gradient(90deg, #2D1B69, #7BC043)"
        />
      }
    >
      {/* Number + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz * 0.7 }}>
        <GlowRings color={ringColor} size={ringSz} />
        <div style={{
          position: "relative", zIndex: 2,
          fontSize: numFs, fontWeight: 900, letterSpacing: -8, lineHeight: 1,
          color: numColor,
          textShadow: `0 0 80px ${ringColor}, 0 0 40px ${ringColor}`,
        }}>
          #{pos}
        </div>
      </div>

      {/* Label */}
      <div style={{
        fontSize: isStory ? 48 : 30, fontWeight: 600,
        color: "rgba(255,255,255,0.6)",
        letterSpacing: 1, textTransform: "uppercase",
      }}>
        in classifica questa settimana
      </div>

      {/* Points pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: isStory ? 14 : 9,
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

// ─── Card: Badge ──────────────────────────────────────────────────────────────

function CardBadge({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const rc = RARITY[data.badgeRarity ?? "common"];
  // Derive a CSS-safe radial stop from the ring color string (already rgba)
  const ringSz   = isStory ? 460 : 310;
  const emojiFs  = isStory ? 196 : 148;
  const logoH    = isStory ? 200 : 120;
  const footerH  = isStory ? 180 : 140;

  return (
    <CardShell id={id} format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 40 : 18}
      bg={
        <CardBg
          bg={`
            radial-gradient(ellipse 70% 64% at -5% -5%, rgba(45,27,105,0.80), transparent 65%),
            radial-gradient(ellipse 55% 55% at 105% 105%, ${rc.ring.replace(/[\d.]+\)$/, "0.30)")}, transparent 65%),
            linear-gradient(155deg, #07031a 0%, #0b0920 100%)
          `}
          accentGrad={`linear-gradient(90deg, #2D1B69, ${rc.color})`}
        />
      }
    >
      {/* "Ho sbloccato" label */}
      <div style={{
        fontSize: isStory ? 34 : 20, fontWeight: 600,
        color: "rgba(255,255,255,0.50)",
        letterSpacing: 3, textTransform: "uppercase",
      }}>
        Ho sbloccato
      </div>

      {/* Emoji + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz }}>
        <GlowRings color={rc.ring} size={ringSz} />
        {/* rarity disc behind emoji — radial gradient so center is visible */}
        <div style={{
          position: "absolute",
          width: ringSz * 0.52, height: ringSz * 0.52,
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${rc.ring.replace(/[\d.]+\)$/, "0.22)")}, transparent 80%)`,
          border: `2px solid ${rc.ring}`,
          boxShadow: `0 0 24px ${rc.ring}`,
        }} />
        <span style={{ position: "relative", zIndex: 2, fontSize: emojiFs, lineHeight: 1 }}>
          {data.badgeIcon ?? "🏅"}
        </span>
      </div>

      {/* Name */}
      <div style={{
        fontSize: isStory ? 80 : 56, fontWeight: 900, letterSpacing: -2, lineHeight: 1.05,
        color: "#fff",
      }}>
        {data.badgeName ?? "Badge"}
      </div>

      {/* Rarity pill */}
      <div style={{
        background: rc.bg,
        border: `1.5px solid ${rc.ring}`,
        borderRadius: 999,
        padding: isStory ? "18px 48px" : "11px 30px",
        fontSize: isStory ? 40 : 26, fontWeight: 800, color: rc.color,
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

// ─── Card: Prize ──────────────────────────────────────────────────────────────

function CardPrize({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const ringSz  = isStory ? 400 : 280;
  const emojiFs = isStory ? 164 : 124;
  const logoH   = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;

  return (
    <CardShell id={id} format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 44 : 22}
      bg={
        <CardBg
          bg={`
            radial-gradient(ellipse 68% 62% at -5% -5%, rgba(120,53,15,0.75), transparent 65%),
            radial-gradient(ellipse 55% 55% at 105% 105%, rgba(45,27,105,0.60), transparent 65%),
            linear-gradient(155deg, #0d0500 0%, #07031a 100%)
          `}
          accentGrad="linear-gradient(90deg, #92400e, #fbbf24)"
        />
      }
    >
      {/* Trophy + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz }}>
        <GlowRings color="rgba(251,191,36,0.48)" size={ringSz} />
        <div style={{
          position: "absolute",
          width: ringSz * 0.52, height: ringSz * 0.52,
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(251,191,36,0.18), transparent 80%)",
          border: "2px solid rgba(251,191,36,0.40)",
          boxShadow: "0 0 24px rgba(251,191,36,0.30)",
        }} />
        <span style={{ position: "relative", zIndex: 2, fontSize: emojiFs, lineHeight: 1 }}>🏆</span>
      </div>

      <div style={{
        fontSize: isStory ? 76 : 52, fontWeight: 900, letterSpacing: -2,
        color: "#fde68a",
        textShadow: "0 0 60px rgba(251,191,36,0.35)",
      }}>
        Ho vinto!
      </div>

      <div style={{
        fontSize: isStory ? 62 : 42, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1,
        color: "#fff", maxWidth: isStory ? 860 : 900,
      }}>
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

// ─── Card: Streak ─────────────────────────────────────────────────────────────

function CardStreak({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const ringSz  = isStory ? 520 : 350;
  const numFs   = isStory ? 300 : 200;
  const fireFs  = isStory ? 140 : 100;
  const logoH   = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;

  return (
    <CardShell id={id} format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 36 : 16}
      bg={
        <CardBg
          bg={`
            radial-gradient(ellipse 70% 65% at -5% -5%, rgba(140,50,10,0.80), transparent 65%),
            radial-gradient(ellipse 55% 55% at 105% 105%, rgba(45,27,105,0.58), transparent 65%),
            linear-gradient(155deg, #0a0200 0%, #07031a 100%)
          `}
          accentGrad="linear-gradient(90deg, #c2410c, #f97316)"
        />
      }
    >
      {/* Fire emoji */}
      <span style={{ fontSize: fireFs, lineHeight: 1 }}>🔥</span>

      {/* Number + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz * 0.68 }}>
        <GlowRings color="rgba(249,115,22,0.42)" size={ringSz} />
        <div style={{
          position: "relative", zIndex: 2,
          fontSize: numFs, fontWeight: 900, letterSpacing: -8, lineHeight: 1,
          color: "#fdba74",
          textShadow: "0 0 80px rgba(249,115,22,0.55), 0 0 40px rgba(249,115,22,0.35)",
        }}>
          {data.streakDays ?? 1}
        </div>
      </div>

      <div style={{
        fontSize: isStory ? 52 : 32, fontWeight: 700,
        color: "rgba(255,255,255,0.68)",
      }}>
        giorni di fila su CityQuest!
      </div>

      <div style={{
        background: "rgba(249,115,22,0.11)",
        border: "1.5px solid rgba(249,115,22,0.38)",
        borderRadius: 999,
        padding: isStory ? "16px 44px" : "10px 28px",
        fontSize: isStory ? 38 : 24, fontWeight: 700, color: "#fdba74",
      }}>
        🔥 Streak attiva
      </div>
    </CardShell>
  );
}

// ─── Card: Mission ────────────────────────────────────────────────────────────

function CardMission({ data, format, id }: { data: ShareCardData; format: ShareCardFormat; id: string }) {
  const isStory = format === "story";
  const ringSz  = isStory ? 380 : 280;
  const emojiFs = isStory ? 160 : 130;
  const logoH   = isStory ? 200 : 120;
  const footerH = isStory ? 180 : 140;

  return (
    <CardShell id={id} format={format} data={data} logoH={logoH} footerH={footerH}
      contentGap={isStory ? 40 : 20}
      bg={
        <CardBg
          bg={`
            radial-gradient(ellipse 68% 62% at -5% -5%, rgba(20,83,45,0.72), transparent 65%),
            radial-gradient(ellipse 55% 55% at 105% 105%, rgba(45,27,105,0.62), transparent 65%),
            linear-gradient(155deg, #010a04 0%, #07031a 100%)
          `}
          accentGrad="linear-gradient(90deg, #166534, #7BC043)"
        />
      }
    >
      {/* Emoji + rings */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: ringSz, height: ringSz }}>
        <GlowRings color="rgba(123,192,67,0.42)" size={ringSz} />
        <div style={{
          position: "absolute",
          width: ringSz * 0.52, height: ringSz * 0.52,
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(123,192,67,0.18), transparent 80%)",
          border: "2px solid rgba(123,192,67,0.36)",
          boxShadow: "0 0 24px rgba(123,192,67,0.25)",
        }} />
        <span style={{ position: "relative", zIndex: 2, fontSize: emojiFs, lineHeight: 1 }}>
          {data.missionIcon ?? "🎯"}
        </span>
      </div>

      <div style={{
        fontSize: isStory ? 36 : 22, fontWeight: 700,
        color: "rgba(255,255,255,0.48)",
        letterSpacing: 3, textTransform: "uppercase",
      }}>
        Missione completata!
      </div>

      <div style={{
        fontSize: isStory ? 74 : 50, fontWeight: 900, letterSpacing: -2, lineHeight: 1.1,
        color: "#fff",
      }}>
        {data.missionName ?? "Missione"}
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: isStory ? 14 : 9,
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

// ─── Image generation ─────────────────────────────────────────────────────────

async function generateCardImage(elementId: string, format: ShareCardFormat): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const el = document.getElementById(elementId);
  if (!el) throw new Error("Card element not found");
  const canvas = await html2canvas(el, {
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

// ─── Format toggle icons ──────────────────────────────────────────────────────

function FormatIcon({ f, active }: { f: ShareCardFormat; active: boolean }) {
  const c = active ? "#2D1B69" : "rgba(0,0,0,0.28)";
  return f === "square"
    ? <div style={{ width: 18, height: 18, border: `2px solid ${c}`, borderRadius: 4, flexShrink: 0 }} />
    : <div style={{ width: 12, height: 18, border: `2px solid ${c}`, borderRadius: 3, flexShrink: 0 }} />;
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

interface ShareModalProps {
  type: ShareCardType;
  data: ShareCardData;
  onClose: () => void;
}

export function ShareModal({ type, data, onClose }: ShareModalProps) {
  const [format, setFormat]     = useState<ShareCardFormat>("square");
  const [previewUrl, setPreview] = useState<string | null>(null);
  const [generating, setGen]    = useState(false);
  const [mounted, setMounted]   = useState(false);

  const cardId = `share-card-${type}-${format}`;

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      setGen(true); setPreview(null);
      try {
        await new Promise(r => setTimeout(r, 100));
        if (cancelled) return;
        const url = await generateCardImage(cardId, format);
        if (!cancelled) setPreview(url);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setGen(false); }
    })();
    return () => { cancelled = true; };
  }, [format, mounted, cardId]);

  const download = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `cityquest-${type}-${format}.png`;
    a.click();
  };

  const share = async () => {
    if (!previewUrl) return;
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(previewUrl)).blob();
        const file = new File([blob], `cityquest-${type}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "CityQuest", text: "Guarda il mio risultato su CityQuest! 🗺️" });
          return;
        }
      } catch { /* fallback */ }
    }
    download();
  };

  if (!mounted) return null;
  const CardComp = cardComponentFor(type);
  const canAct = !!previewUrl && !generating;

  return createPortal(
    <>
      {/* Off-screen card render */}
      <div aria-hidden="true" style={{ pointerEvents: "none", userSelect: "none" }}>
        <CardComp data={data} format={format} id={cardId} />
      </div>

      {/* Overlay */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(5,3,15,0.74)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        zIndex: 9000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}>
        {/* Modal */}
        <div onClick={e => e.stopPropagation()} style={{
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 32px 80px rgba(0,0,0,0.42), 0 0 0 1px rgba(0,0,0,0.06)",
          maxWidth: 400, width: "100%",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Gradient top stripe */}
          <div style={{ height: 5, background: "linear-gradient(90deg, #2D1B69, #7BC043)", flexShrink: 0 }} />

          <div style={{ padding: "20px 20px 24px", display: "grid", gap: 16 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: -0.3 }}>Condividi il risultato</div>
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.42)", marginTop: 3, fontWeight: 500 }}>
                  Scegli il formato e scarica la card
                </div>
              </div>
              <button onClick={onClose} aria-label="Chiudi" style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "1.5px solid rgba(0,0,0,0.10)",
                background: "rgba(0,0,0,0.03)", cursor: "pointer",
                fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(0,0,0,0.45)", flexShrink: 0, marginTop: 2,
              }}>✕</button>
            </div>

            {/* Format toggle */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.045)", borderRadius: 12, padding: 3 }}>
              {(["square", "story"] as const).map(f => (
                <button key={f} onClick={() => setFormat(f)} style={{
                  flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                  cursor: "pointer", fontWeight: 700, fontSize: 13,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: format === f ? "#fff" : "transparent",
                  boxShadow: format === f ? "0 1px 6px rgba(0,0,0,0.11), 0 0 0 1px rgba(0,0,0,0.04)" : "none",
                  color: format === f ? "#2D1B69" : "rgba(0,0,0,0.36)",
                  transition: "all 180ms cubic-bezier(0.22,1,0.36,1)",
                }}>
                  <FormatIcon f={f} active={format === f} />
                  {f === "square" ? "Feed" : "Story"}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div style={{
              borderRadius: 14, overflow: "hidden",
              background: "linear-gradient(145deg, #0f0c1a, #090d08)",
              aspectRatio: format === "square" ? "1 / 1" : "9 / 16",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}>
              {generating && (
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    border: "3px solid rgba(123,192,67,0.18)",
                    borderTopColor: "#7BC043",
                    margin: "0 auto 10px",
                    animation: "scSpin .7s linear infinite",
                  }} />
                  <style>{`@keyframes scSpin{to{transform:rotate(360deg)}}`}</style>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Generazione…</div>
                </div>
              )}
              {canAct && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl!} alt="Anteprima" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              )}
            </div>

            {/* Dimension hint */}
            {canAct && (
              <div style={{ textAlign: "center", fontSize: 11, color: "rgba(0,0,0,0.32)", fontWeight: 500, marginTop: -4 }}>
                {format === "square" ? "1080 × 1080 px" : "1080 × 1920 px"} · PNG
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 8 }}>
              <button onClick={download} disabled={!canAct} style={{
                padding: "12px 0", borderRadius: 12,
                border: "1.5px solid rgba(0,0,0,0.09)",
                background: canAct ? "#fff" : "rgba(0,0,0,0.03)",
                cursor: canAct ? "pointer" : "not-allowed",
                fontWeight: 700, fontSize: 14,
                color: canAct ? "#0f172a" : "rgba(0,0,0,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: canAct ? "0 2px 8px rgba(0,0,0,0.07)" : "none",
                transition: "all 160ms",
              }}>
                ⬇️ Scarica
              </button>
              <button onClick={share} disabled={!canAct} style={{
                padding: "12px 0", borderRadius: 12, border: "none",
                background: canAct ? "linear-gradient(90deg,#2D1B69,#7BC043)" : "rgba(0,0,0,0.06)",
                cursor: canAct ? "pointer" : "not-allowed",
                fontWeight: 800, fontSize: 14,
                color: canAct ? "#fff" : "rgba(0,0,0,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                opacity: canAct ? 1 : 0.5,
                boxShadow: canAct ? "0 4px 16px rgba(45,27,105,0.32)" : "none",
                transition: "opacity 160ms",
              }}>
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
