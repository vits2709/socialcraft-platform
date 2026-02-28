import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const type         = searchParams.get("type");
  const format       = searchParams.get("format") || "square";
  const username     = searchParams.get("username") || "Esploratore";
  const avatarEmoji  = searchParams.get("avatar") || "🧭";
  const profileColor = searchParams.get("color") || "#2D1B69";

  const badgeName   = searchParams.get("badge_name")   || "";
  const badgeEmoji  = searchParams.get("badge_emoji")  || "🎖️";
  const badgeRarity = searchParams.get("badge_rarity") || "Comune";
  const badgeDate   = searchParams.get("badge_date")   || "";

  const rankPosition = searchParams.get("rank")   || "1";
  const rankPoints   = searchParams.get("points") || "0";

  const streakDays = searchParams.get("streak") || "1";

  const prizeName = searchParams.get("prize_name") || "";
  const prizeSpot = searchParams.get("prize_spot") || "";

  const missionName   = searchParams.get("mission_name")   || "";
  const missionEmoji  = searchParams.get("mission_emoji")  || "🎯";
  const missionPoints = searchParams.get("mission_points") || "0";

  const width  = 1080;
  const height = format === "story" ? 1920 : 1080;
  const isStory = format === "story";

  const rarityColors: Record<string, string> = {
    Comune:      "#4A90E2",
    Raro:        "#9B59B6",
    Epico:       "#E67E22",
    Leggendario: "#E74C3C",
  };
  const rarityColor = rarityColors[badgeRarity] || "#4A90E2";

  const glowColors: Record<string, string> = {
    badge:   rarityColor,
    ranking: "#F4D03F",
    streak:  "#E67E22",
    prize:   "#F4D03F",
    mission: "#7BC043",
  };
  const glowColor = glowColors[type || "badge"] || "#2D1B69";

  const circleSizeLg = isStory ? 320 : 260;
  const circleSizeMd = isStory ? 340 : 280;
  const circleSizeXl = isStory ? 380 : 320;

  const renderCenter = () => {
    switch (type) {
      case "badge":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: circleSizeLg, height: circleSizeLg, borderRadius: circleSizeLg / 2,
              backgroundColor: `${rarityColor}33`,
              boxShadow: `0 0 80px ${rarityColor}66, 0 0 160px ${rarityColor}33`,
            }}>
              <span style={{ fontSize: isStory ? 140 : 110 }}>{badgeEmoji}</span>
            </div>
            <span style={{ color: "#888888", fontSize: 26, letterSpacing: 4, fontFamily: "sans-serif" }}>
              HO SBLOCCATO
            </span>
            <span style={{ color: "white", fontSize: isStory ? 80 : 68, fontWeight: 900, fontFamily: "sans-serif", textAlign: "center" }}>
              {badgeName}
            </span>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: `${rarityColor}44`, borderRadius: 100,
              paddingTop: 12, paddingBottom: 12, paddingLeft: 36, paddingRight: 36,
            }}>
              <span style={{ color: rarityColor, fontSize: 28, fontWeight: 700, fontFamily: "sans-serif" }}>
                {badgeRarity}
              </span>
            </div>
            {badgeDate && (
              <span style={{ color: "#666666", fontSize: 24, fontFamily: "sans-serif" }}>{badgeDate}</span>
            )}
          </div>
        );

      case "ranking":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: circleSizeXl, height: circleSizeXl, borderRadius: circleSizeXl / 2,
              backgroundColor: "#F4D03F22",
              boxShadow: "0 0 100px #F4D03F55, 0 0 200px #F4D03F22",
            }}>
              <span style={{ color: "#F4D03F", fontSize: isStory ? 180 : 150, fontWeight: 900, fontFamily: "sans-serif" }}>
                #{rankPosition}
              </span>
            </div>
            <span style={{ color: "#888888", fontSize: 26, letterSpacing: 4, fontFamily: "sans-serif" }}>
              IN CLASSIFICA QUESTA SETTIMANA
            </span>
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              backgroundColor: "#1a4a1a", borderRadius: 100,
              paddingTop: 16, paddingBottom: 16, paddingLeft: 40, paddingRight: 40,
            }}>
              <span style={{ fontSize: 28 }}>⭐</span>
              <span style={{ color: "#7BC043", fontSize: 36, fontWeight: 700, fontFamily: "sans-serif" }}>
                {rankPoints} punti
              </span>
            </div>
          </div>
        );

      case "streak":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              width: circleSizeMd, height: circleSizeMd, borderRadius: circleSizeMd / 2,
              backgroundColor: "#E67E2222",
              boxShadow: "0 0 100px #E67E2255, 0 0 200px #E67E2222",
              gap: 4,
            }}>
              <span style={{ fontSize: 52 }}>🔥</span>
              <span style={{ color: "#F0A060", fontSize: isStory ? 140 : 110, fontWeight: 900, fontFamily: "sans-serif", lineHeight: 1 }}>
                {streakDays}
              </span>
            </div>
            <span style={{ color: "white", fontSize: 36, fontFamily: "sans-serif", textAlign: "center" }}>
              giorni di fila su CityQuest!
            </span>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              backgroundColor: "#3a1a0a", borderRadius: 100,
              paddingTop: 14, paddingBottom: 14, paddingLeft: 36, paddingRight: 36,
            }}>
              <span style={{ fontSize: 24 }}>🔥</span>
              <span style={{ color: "#E67E22", fontSize: 28, fontWeight: 700, fontFamily: "sans-serif" }}>
                Streak attiva
              </span>
            </div>
          </div>
        );

      case "prize":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: circleSizeLg, height: circleSizeLg, borderRadius: circleSizeLg / 2,
              backgroundColor: "#F4D03F22",
              boxShadow: "0 0 100px #F4D03F55, 0 0 200px #F4D03F22",
            }}>
              <span style={{ fontSize: isStory ? 140 : 110 }}>🏆</span>
            </div>
            <span style={{ color: "#888888", fontSize: 26, letterSpacing: 4, fontFamily: "sans-serif" }}>
              HO VINTO!
            </span>
            <span style={{ color: "white", fontSize: isStory ? 64 : 56, fontWeight: 900, fontFamily: "sans-serif", textAlign: "center" }}>
              {prizeName}
            </span>
            {prizeSpot && (
              <span style={{ color: "#888888", fontSize: 28, fontFamily: "sans-serif" }}>da {prizeSpot}</span>
            )}
          </div>
        );

      case "mission":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: circleSizeLg, height: circleSizeLg, borderRadius: circleSizeLg / 2,
              backgroundColor: "#7BC04322",
              boxShadow: "0 0 80px #7BC04355, 0 0 160px #7BC04322",
            }}>
              <span style={{ fontSize: isStory ? 130 : 100 }}>{missionEmoji}</span>
            </div>
            <span style={{ color: "#888888", fontSize: 26, letterSpacing: 4, fontFamily: "sans-serif" }}>
              MISSIONE COMPLETATA
            </span>
            <span style={{ color: "white", fontSize: isStory ? 64 : 56, fontWeight: 900, fontFamily: "sans-serif", textAlign: "center" }}>
              {missionName}
            </span>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              backgroundColor: "#1a3a1a", borderRadius: 100,
              paddingTop: 14, paddingBottom: 14, paddingLeft: 36, paddingRight: 36,
            }}>
              <span style={{ color: "#7BC043", fontSize: 30, fontWeight: 700, fontFamily: "sans-serif" }}>
                +{missionPoints} punti
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#0a0a0f",
        backgroundImage: `radial-gradient(ellipse at 50% 50%, ${glowColor}15 0%, transparent 70%)`,
        padding: isStory ? "80px 60px" : "50px 60px",
        position: "relative",
      }}>

        {/* Dot grid — top right */}
        <div style={{ position: "absolute", top: 40, right: 40, display: "flex", flexDirection: "column", gap: 6 }}>
          {([0, 1, 2] as const).map((row) => (
            <div key={row} style={{ display: "flex", gap: 6 }}>
              {([0, 1, 2] as const).map((col) => (
                <div key={col} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#333333" }} />
              ))}
            </div>
          ))}
        </div>

        {/* Corner bracket — bottom left */}
        <div style={{ position: "absolute", bottom: 100, left: 40, display: "flex", flexDirection: "column" }}>
          <div style={{ width: 30, height: 3, backgroundColor: "#333333" }} />
          <div style={{ width: 3, height: 30, backgroundColor: "#333333" }} />
        </div>

        {/* Corner bracket — top left */}
        <div style={{ position: "absolute", top: 100, left: 40, display: "flex", flexDirection: "column" }}>
          <div style={{ width: 30, height: 3, backgroundColor: "#333333" }} />
          <div style={{ width: 3, height: 30, backgroundColor: "#333333" }} />
        </div>

        {/* Logo header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "#1a1a2e", borderRadius: 100,
          paddingTop: 16, paddingBottom: 16, paddingLeft: 36, paddingRight: 36,
          gap: 14,
        }}>
          <span style={{ fontSize: 28 }}>🗺️</span>
          <span style={{ color: "white", fontSize: 32, fontWeight: 700, fontFamily: "sans-serif" }}>CityQuest</span>
        </div>

        {/* Central content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
          {renderCenter()}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: profileColor, fontSize: 28,
            }}>
              <span>{avatarEmoji}</span>
            </div>
            <span style={{ color: "white", fontSize: 30, fontWeight: 600, fontFamily: "sans-serif" }}>
              @{username}
            </span>
          </div>
          <span style={{ color: "#444444", fontSize: 24, fontFamily: "sans-serif" }}>cityquest.it</span>
        </div>

      </div>
    ),
    { width, height }
  );
}
