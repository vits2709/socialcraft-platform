"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShareCardType = "badge" | "ranking" | "prize" | "streak" | "mission";
export type ShareCardFormat = "square" | "story";

export interface ShareCardData {
  username: string;
  avatarEmoji?: string | null;
  profileColor?: string | null;
  // Badge
  badgeIcon?: string;
  badgeName?: string;
  badgeRarity?: "common" | "rare" | "epic" | "legendary";
  badgeUnlockedAt?: string | null;
  // Ranking
  rankPosition?: number;
  rankPoints?: number;
  rankCity?: string;
  // Prize
  prizeName?: string;
  prizeSpot?: string;
  // Streak
  streakDays?: number;
  // Mission
  missionIcon?: string;
  missionName?: string;
  missionPoints?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, { label: string; color: string; glow: string }> = {
  common:    { label: "Comune",      color: "#60a5fa", glow: "rgba(96,165,250,0.45)" },
  rare:      { label: "Raro",        color: "#a78bfa", glow: "rgba(167,139,250,0.45)" },
  epic:      { label: "Epico",       color: "#fb923c", glow: "rgba(251,146,60,0.45)" },
  legendary: { label: "Leggendario", color: "#fbbf24", glow: "rgba(251,191,36,0.55)" },
};

// ─── Card HTML renderers (these are rendered at real size off-screen) ─────────

function CardBadge({
  data,
  format,
  id,
}: {
  data: ShareCardData;
  format: ShareCardFormat;
  id: string;
}) {
  const isStory = format === "story";
  const w = 1080;
  const h = isStory ? 1920 : 1080;
  const rc = RARITY_COLORS[data.badgeRarity ?? "common"];

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: w,
        height: h,
        background: "linear-gradient(145deg, #1a0a3d 0%, #0d1f0a 55%, #111 100%)",
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
      {/* Background geometric shapes */}
      <GeoBg />

      {/* Logo */}
      <Logo isStory={isStory} />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 48 : 28,
          padding: isStory ? "0 120px" : "0 80px",
          position: "relative",
          zIndex: 2,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: isStory ? 22 : 18,
            fontWeight: 600,
            opacity: 0.72,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Ho sbloccato
        </div>

        {/* Badge emoji */}
        <div
          style={{
            fontSize: isStory ? 220 : 160,
            lineHeight: 1,
            filter: `drop-shadow(0 0 40px ${rc.glow})`,
          }}
        >
          {data.badgeIcon ?? "🏅"}
        </div>

        {/* Badge name */}
        <div
          style={{
            fontSize: isStory ? 88 : 64,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.05,
            maxWidth: isStory ? 840 : 860,
          }}
        >
          {data.badgeName ?? "Badge"}
        </div>

        {/* Rarity pill */}
        <div
          style={{
            background: `linear-gradient(90deg, ${rc.color}33, ${rc.color}18)`,
            border: `2px solid ${rc.color}88`,
            borderRadius: 999,
            padding: isStory ? "20px 48px" : "14px 32px",
            fontSize: isStory ? 42 : 28,
            fontWeight: 800,
            color: rc.color,
            letterSpacing: 1,
          }}
        >
          {rc.label}
        </div>

        {/* Date */}
        {data.badgeUnlockedAt && (
          <div style={{ fontSize: isStory ? 36 : 24, opacity: 0.5, fontWeight: 500 }}>
            {new Date(data.badgeUnlockedAt).toLocaleDateString("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}
      </div>

      {/* User + footer */}
      <CardFooter data={data} isStory={isStory} />
    </div>
  );
}

function CardRanking({
  data,
  format,
  id,
}: {
  data: ShareCardData;
  format: ShareCardFormat;
  id: string;
}) {
  const isStory = format === "story";
  const w = 1080;
  const h = isStory ? 1920 : 1080;

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: w,
        height: h,
        background: "linear-gradient(145deg, #1a0a3d 0%, #0a1f2a 60%, #0a2010 100%)",
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
      <GeoBg />
      <Logo isStory={isStory} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 56 : 32,
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: isStory ? "0 120px" : "0 80px",
        }}
      >
        {/* Position number */}
        <div
          style={{
            fontSize: isStory ? 380 : 260,
            fontWeight: 900,
            lineHeight: 0.85,
            background: "linear-gradient(135deg, #7BC043, #2D1B69)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -12,
            filter: "drop-shadow(0 0 60px rgba(123,192,67,0.3))",
          }}
        >
          #{data.rankPosition ?? 1}
        </div>

        <div
          style={{
            fontSize: isStory ? 56 : 38,
            fontWeight: 700,
            opacity: 0.8,
            letterSpacing: 1,
          }}
        >
          in classifica questa settimana
        </div>

        {/* Points pill */}
        <div
          style={{
            background: "rgba(123,192,67,0.15)",
            border: "2px solid rgba(123,192,67,0.5)",
            borderRadius: 999,
            padding: isStory ? "24px 60px" : "16px 40px",
            fontSize: isStory ? 56 : 36,
            fontWeight: 900,
            color: "#7BC043",
          }}
        >
          {(data.rankPoints ?? 0).toLocaleString("it-IT")} punti
        </div>

        {data.rankCity && (
          <div style={{ fontSize: isStory ? 42 : 28, opacity: 0.55 }}>
            📍 {data.rankCity}
          </div>
        )}
      </div>

      <CardFooter data={data} isStory={isStory} />
    </div>
  );
}

function CardPrize({
  data,
  format,
  id,
}: {
  data: ShareCardData;
  format: ShareCardFormat;
  id: string;
}) {
  const isStory = format === "story";
  const w = 1080;
  const h = isStory ? 1920 : 1080;

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: w,
        height: h,
        background: "linear-gradient(145deg, #2a1505 0%, #1a0a3d 50%, #0d200d 100%)",
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
      <GeoBg accent="#fbbf24" />
      <Logo isStory={isStory} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 52 : 28,
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: isStory ? "0 120px" : "0 80px",
        }}
      >
        <div
          style={{ fontSize: isStory ? 220 : 160, lineHeight: 1, filter: "drop-shadow(0 0 50px rgba(251,191,36,0.6))" }}
        >
          🏆
        </div>

        <div
          style={{
            fontSize: isStory ? 80 : 56,
            fontWeight: 900,
            letterSpacing: -1,
            background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Ho vinto!
        </div>

        <div
          style={{
            fontSize: isStory ? 68 : 46,
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1.1,
            maxWidth: isStory ? 840 : 880,
          }}
        >
          {data.prizeName ?? "Un premio speciale"}
        </div>

        {data.prizeSpot && (
          <div
            style={{
              fontSize: isStory ? 44 : 30,
              opacity: 0.75,
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

function CardStreak({
  data,
  format,
  id,
}: {
  data: ShareCardData;
  format: ShareCardFormat;
  id: string;
}) {
  const isStory = format === "story";
  const w = 1080;
  const h = isStory ? 1920 : 1080;

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: w,
        height: h,
        background: "linear-gradient(145deg, #1f0a00 0%, #1a0a3d 55%, #0a100a 100%)",
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
      <GeoBg accent="#f97316" />
      <Logo isStory={isStory} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 56 : 30,
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: isStory ? "0 120px" : "0 80px",
        }}
      >
        <div
          style={{ fontSize: isStory ? 220 : 160, lineHeight: 1, filter: "drop-shadow(0 0 50px rgba(249,115,22,0.7))" }}
        >
          🔥
        </div>

        <div
          style={{
            fontSize: isStory ? 340 : 230,
            fontWeight: 900,
            letterSpacing: -10,
            lineHeight: 0.9,
            background: "linear-gradient(135deg, #f97316, #fbbf24)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 30px rgba(249,115,22,0.5))",
          }}
        >
          {data.streakDays ?? 1}
        </div>

        <div
          style={{
            fontSize: isStory ? 60 : 40,
            fontWeight: 700,
            opacity: 0.85,
          }}
        >
          giorni di fila su CityQuest!
        </div>
      </div>

      <CardFooter data={data} isStory={isStory} />
    </div>
  );
}

function CardMission({
  data,
  format,
  id,
}: {
  data: ShareCardData;
  format: ShareCardFormat;
  id: string;
}) {
  const isStory = format === "story";
  const w = 1080;
  const h = isStory ? 1920 : 1080;

  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: -9999,
        top: 0,
        width: w,
        height: h,
        background: "linear-gradient(145deg, #0a1520 0%, #1a0a3d 50%, #0a200a 100%)",
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
      <GeoBg accent="#7BC043" />
      <Logo isStory={isStory} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isStory ? 52 : 28,
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: isStory ? "0 120px" : "0 80px",
        }}
      >
        <div
          style={{ fontSize: isStory ? 220 : 160, lineHeight: 1, filter: "drop-shadow(0 0 40px rgba(123,192,67,0.5))" }}
        >
          {data.missionIcon ?? "🎯"}
        </div>

        <div
          style={{
            fontSize: isStory ? 46 : 32,
            fontWeight: 600,
            opacity: 0.75,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Missione completata!
        </div>

        <div
          style={{
            fontSize: isStory ? 80 : 56,
            fontWeight: 900,
            letterSpacing: -1,
            lineHeight: 1.1,
            maxWidth: isStory ? 840 : 880,
          }}
        >
          {data.missionName ?? "Missione"}
        </div>

        {/* Points */}
        <div
          style={{
            background: "rgba(123,192,67,0.18)",
            border: "2px solid rgba(123,192,67,0.55)",
            borderRadius: 999,
            padding: isStory ? "24px 60px" : "16px 40px",
            fontSize: isStory ? 60 : 40,
            fontWeight: 900,
            color: "#7BC043",
          }}
        >
          +{data.missionPoints ?? 0} punti
        </div>
      </div>

      <CardFooter data={data} isStory={isStory} />
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function GeoBg({ accent = "#7BC043" }: { accent?: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
      {/* Large blobs */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: -200,
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "rgba(45,27,105,0.35)",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          right: -150,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `${accent}22`,
          filter: "blur(100px)",
        }}
      />
      {/* Geometric lines */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          right: "8%",
          width: 220,
          height: 220,
          border: "2px solid rgba(255,255,255,0.06)",
          borderRadius: 32,
          transform: "rotate(22deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "18%",
          left: "6%",
          width: 160,
          height: 160,
          border: "2px solid rgba(255,255,255,0.04)",
          borderRadius: 24,
          transform: "rotate(-14deg)",
        }}
      />
      {/* Small accent circle */}
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "5%",
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `${accent}18`,
          border: `1.5px solid ${accent}30`,
        }}
      />
    </div>
  );
}

function Logo({ isStory }: { isStory: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        top: isStory ? 80 : 48,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 3,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isStory ? 18 : 10,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 999,
          padding: isStory ? "16px 40px" : "10px 24px",
        }}
      >
        <span style={{ fontSize: isStory ? 36 : 20 }}>🗺️</span>
        <span
          style={{
            fontWeight: 900,
            fontSize: isStory ? 40 : 22,
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

function CardFooter({ data, isStory }: { data: ShareCardData; isStory: boolean }) {
  const color = data.profileColor ?? "#2D1B69";
  return (
    <div
      style={{
        position: "absolute",
        bottom: isStory ? 90 : 52,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isStory ? 20 : 12,
        zIndex: 3,
      }}
    >
      {/* User row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isStory ? 22 : 14,
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 999,
          padding: isStory ? "18px 44px" : "10px 26px",
        }}
      >
        {/* Avatar bubble */}
        <div
          style={{
            width: isStory ? 64 : 38,
            height: isStory ? 64 : 38,
            borderRadius: "50%",
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isStory ? 32 : 18,
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        >
          {data.avatarEmoji ?? "👤"}
        </div>
        <span style={{ fontWeight: 800, fontSize: isStory ? 44 : 26, color: "#fff" }}>
          @{data.username}
        </span>
      </div>

      {/* Domain */}
      <div
        style={{
          fontSize: isStory ? 32 : 18,
          color: "rgba(255,255,255,0.38)",
          fontWeight: 500,
          letterSpacing: 1,
        }}
      >
        cityquest.it
      </div>
    </div>
  );
}

// ─── Image generation ─────────────────────────────────────────────────────────

async function generateCardImage(elementId: string, format: ShareCardFormat): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Card element not found");

  const width = 1080;
  const height = format === "story" ? 1920 : 1080;

  const canvas = await html2canvas(element, {
    width,
    height,
    scale: 1,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
  });

  return canvas.toDataURL("image/png");
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

  // Unique ID per card render
  const cardId = `share-card-${type}-${format}`;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Regenerate preview when format changes
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const generate = async () => {
      setGenerating(true);
      setPreviewUrl(null);
      try {
        // Wait for DOM paint
        await new Promise((r) => setTimeout(r, 80));
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
      } catch {
        // fallback to download
      }
    }
    handleDownload();
  };

  if (!mounted) return null;

  const CardComponent = cardComponentFor(type);

  return createPortal(
    <>
      {/* Hidden card renders for image capture */}
      <div aria-hidden="true" style={{ pointerEvents: "none" }}>
        <CardComponent data={data} format={format} id={cardId} />
      </div>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.62)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 9000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "rgba(255,255,255,0.97)",
            borderRadius: 22,
            boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
            padding: 24,
            maxWidth: 420,
            width: "100%",
            display: "grid",
            gap: 20,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>📸 Condividi</div>
              <div style={{ fontSize: 13, opacity: 0.55, marginTop: 2 }}>
                Scegli il formato e scarica la card
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(0,0,0,0.04)",
                cursor: "pointer",
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Chiudi"
            >
              ×
            </button>
          </div>

          {/* Format toggle */}
          <div
            style={{
              display: "flex",
              gap: 8,
              background: "rgba(0,0,0,0.05)",
              borderRadius: 14,
              padding: 4,
            }}
          >
            {(["square", "story"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 11,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  background: format === f ? "#fff" : "transparent",
                  boxShadow: format === f ? "0 2px 8px rgba(0,0,0,0.10)" : "none",
                  color: format === f ? "#2D1B69" : "rgba(0,0,0,0.45)",
                  transition: "all 160ms",
                }}
              >
                {f === "square" ? "Feed 📸" : "Story 📱"}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              background: "rgba(0,0,0,0.06)",
              aspectRatio: format === "square" ? "1 / 1" : "9 / 16",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {generating && (
              <div style={{ textAlign: "center", opacity: 0.5 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Generazione in corso…</div>
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

          {/* Action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              onClick={handleDownload}
              disabled={!previewUrl || generating}
              className="btn"
              style={{ opacity: !previewUrl || generating ? 0.5 : 1, fontSize: 14, fontWeight: 700 }}
            >
              ⬇️ Scarica
            </button>
            <button
              onClick={handleShare}
              disabled={!previewUrl || generating}
              className="btn primary"
              style={{ opacity: !previewUrl || generating ? 0.5 : 1, fontSize: 14, fontWeight: 700 }}
            >
              📤 Condividi
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Utility: map type → component ───────────────────────────────────────────

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
      <button
        onClick={() => setOpen(true)}
        className={className ?? "btn"}
        style={style}
      >
        {label ?? "📸 Condividi"}
      </button>
      {open && <ShareModal type={type} data={data} onClose={() => setOpen(false)} />}
    </>
  );
}
