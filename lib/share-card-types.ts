// Shared types for share cards — usable both server-side (API route) and client-side.
// No "use client" directive.

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

export const RARITY: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  common:    { label: "Comune",      color: "#93c5fd", bg: "rgba(59,130,246,0.12)",  ring: "rgba(96,165,250,0.45)" },
  rare:      { label: "Raro",        color: "#c4b5fd", bg: "rgba(124,58,237,0.12)", ring: "rgba(167,139,250,0.45)" },
  epic:      { label: "Epico",       color: "#fdba74", bg: "rgba(234,88,12,0.12)",  ring: "rgba(251,146,60,0.45)" },
  legendary: { label: "Leggendario", color: "#fde68a", bg: "rgba(217,119,6,0.14)",  ring: "rgba(251,191,36,0.55)" },
};
