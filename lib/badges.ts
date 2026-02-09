export type BadgeTier = "BRONZE" | "SILVER" | "GOLD";

export type BadgeCard = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;

  tier: BadgeTier;

  // progress
  value: number;
  target: number;
  nextTarget: number | null;
  nextLabel: string | null;

  progress: number; // 0..1
  achieved: boolean;
};

type BuildBadgesInput = {
  score: number;

  scans_today: number;
  visits_today: number;
  points_today: number;

  scans_7d: number;
  visits_7d: number;
  points_7d: number;

  active_days_7d: number;
  current_streak_days: number;
  distinct_venues_30d: number;
};

function clamp01(x: number) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function tierFromProgress(p: number): BadgeTier {
  if (p >= 1) return "GOLD";
  if (p >= 0.66) return "SILVER";
  return "BRONZE";
}

function makeBadge(args: Omit<BadgeCard, "tier" | "progress" | "achieved"> & { value: number; target: number }) {
  const progress = clamp01(args.target <= 0 ? 0 : args.value / args.target);
  const achieved = progress >= 1;

  // tier "visuale" basata su progress (semplice e carina)
  const tier = tierFromProgress(progress);

  return {
    ...args,
    tier,
    progress,
    achieved,
  } satisfies BadgeCard;
}

export function tierPill(tier: BadgeTier) {
  return tier;
}

export function buildBadges(i: BuildBadgesInput): BadgeCard[] {
  // Targets (puoi tararli quando vuoi)
  const scannerTarget = 35; // scans in 7d
  const explorerTarget = 6; // venue diverse 30d
  const streakTarget = 3; // streak days
  const activeTarget = 5; // active days 7d
  const scoreTarget = 50; // total points

  const scanner = makeBadge({
    id: "scanner",
    title: "Scanner",
    subtitle: "Scan settimanali",
    description: "Fai scan nelle venue per salire in classifica. Continua così per sbloccare il prossimo livello.",
    icon: "📸",
    value: Number(i.scans_7d || 0),
    target: scannerTarget,
    nextTarget: null,
    nextLabel: "Prossimo: SILVER (≈ 66%)",
  });

  const explorer = makeBadge({
    id: "explorer",
    title: "Explorer",
    subtitle: "Venue diverse",
    description: "Esplora venue diverse per sbloccare badge e bonus social. Continua così per sbloccare il prossimo livello.",
    icon: "🗺️",
    value: Number(i.distinct_venues_30d || 0),
    target: explorerTarget,
    nextTarget: null,
    nextLabel: "Prossimo: SILVER (≈ 66%)",
  });

  const streak = makeBadge({
    id: "streak",
    title: "Streak",
    subtitle: "Costanza giornaliera",
    description: "Scansiona almeno 1 volta al giorno per mantenere la streak.",
    icon: "🔥",
    value: Number(i.current_streak_days || 0),
    target: streakTarget,
    nextTarget: null,
    nextLabel: "Prossimo: SILVER (≈ 66%)",
  });

  const active = makeBadge({
    id: "active",
    title: "Attivo",
    subtitle: "Giorni attivi /7d",
    description: "Più giorni attivi, più probabilità di salire veloce.",
    icon: "📅",
    value: Number(i.active_days_7d || 0),
    target: activeTarget,
    nextTarget: null,
    nextLabel: "Prossimo: SILVER (≈ 66%)",
  });

  const score = makeBadge({
    id: "score",
    title: "Punti Totali",
    subtitle: "Crescita generale",
    description: "Accumula punti con scan e visite confermate.",
    icon: "🏆",
    value: Number(i.score || 0),
    target: scoreTarget,
    nextTarget: null,
    nextLabel: "Prossimo: SILVER (≈ 66%)",
  });

  return [scanner, explorer, streak, active, score];
}