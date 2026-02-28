"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ShareCardType, ShareCardFormat, ShareCardData } from "@/lib/share-card-types";

// Re-export types so existing imports from this path keep working
export type { ShareCardType, ShareCardFormat, ShareCardData } from "@/lib/share-card-types";

// ─── Image generation via API ─────────────────────────────────────────────────

const RARITY_LABELS: Record<string, string> = {
  common: "Comune", rare: "Raro", epic: "Epico", legendary: "Leggendario",
};

async function fetchCardImage(
  type: ShareCardType,
  data: ShareCardData,
  format: ShareCardFormat
): Promise<string> {
  const params = new URLSearchParams({
    type,
    format,
    username:     data.username,
    avatar:       data.avatarEmoji  ?? "🧭",
    color:        data.profileColor ?? "#2D1B69",
    // badge
    badge_emoji:  data.badgeIcon   ?? "🎖️",
    badge_name:   data.badgeName   ?? "",
    badge_rarity: RARITY_LABELS[data.badgeRarity ?? "common"] ?? "Comune",
    // ranking
    rank:   String(data.rankPosition ?? 1),
    points: String(data.rankPoints   ?? 0),
    // streak
    streak: String(data.streakDays ?? 1),
    // prize
    prize_name: data.prizeName ?? "",
    prize_spot: data.prizeSpot ?? "",
    // mission
    mission_name:   data.missionName   ?? "",
    mission_emoji:  data.missionIcon   ?? "🎯",
    mission_points: String(data.missionPoints ?? 0),
  });

  if (data.badgeUnlockedAt) {
    params.set(
      "badge_date",
      new Date(data.badgeUnlockedAt).toLocaleDateString("it-IT", {
        day: "numeric", month: "long", year: "numeric",
      })
    );
  }

  const res = await fetch(`/api/share-card?${params}`);
  if (!res.ok) throw new Error(`Card generation failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ─── Format toggle icon ───────────────────────────────────────────────────────

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
  const [format, setFormat]      = useState<ShareCardFormat>("square");
  const [previewUrl, setPreview] = useState<string | null>(null);
  const [generating, setGen]     = useState(false);
  const [mounted, setMounted]    = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      setGen(true);
      setPreview(null);
      try {
        const url = await fetchCardImage(type, data, format);
        objectUrl = url;
        if (!cancelled) setPreview(url);
      } catch (e) {
        console.error("ShareCard generation error:", e);
      } finally {
        if (!cancelled) setGen(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [format, mounted, type]); // data is stable per open

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
        const res = await fetch(previewUrl);
        const blob = await res.blob();
        const file = new File([blob], `cityquest-${type}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "CityQuest", text: "Guarda il mio risultato su CityQuest! 🗺️" });
          return;
        }
      } catch { /* fallback to download */ }
    }
    download();
  };

  if (!mounted) return null;
  const canAct = !!previewUrl && !generating;

  return createPortal(
    <>
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
          {/* Top accent stripe */}
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
