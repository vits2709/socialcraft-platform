// Fonte di verità unica per i livelli esploratori.
// Usato sia dal profilo (/me) che dalla leaderboard.

export type ExplorerLevel = {
  key: string;
  name: string;
  emoji: string;
  min: number;
  desc: string;
};

export const EXPLORER_LEVELS: ExplorerLevel[] = [
  { key: "new",      name: "Nuovo",    emoji: "🌱", min: 0,   desc: "Appena arrivato" },
  { key: "curioso",  name: "Curioso",  emoji: "👀", min: 25,  desc: "In esplorazione" },
  { key: "explorer", name: "Explorer", emoji: "🧭", min: 75,  desc: "Gira gli spot" },
  { key: "regular",  name: "Regular",  emoji: "⭐", min: 150, desc: "Presenza costante" },
  { key: "veteran",  name: "Veterano", emoji: "🏅", min: 300, desc: "Ormai di casa" },
  { key: "legend",   name: "Leggenda", emoji: "👑", min: 500, desc: "Top player" },
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export type LevelInfo = {
  current: ExplorerLevel;
  next: ExplorerLevel | null;
  /** progresso percentuale nel livello corrente (0-100) */
  progress: number;
  /** punti interi che mancano al prossimo livello */
  toNext: number;
  curMin: number;
  nextMin: number;
};

export function getExplorerLevel(points: number): LevelInfo {
  const p = Number(points) || 0;

  let current = EXPLORER_LEVELS[0];
  for (const lvl of EXPLORER_LEVELS) {
    if (p >= lvl.min) current = lvl;
  }

  const idx = EXPLORER_LEVELS.findIndex((l) => l.key === current.key);
  const next = idx >= 0 && idx < EXPLORER_LEVELS.length - 1
    ? EXPLORER_LEVELS[idx + 1]
    : null;

  const curMin = current.min;
  const nextMin = next?.min ?? current.min;
  const span = Math.max(1, nextMin - curMin);
  const inLevel = clamp(p - curMin, 0, span);
  const progress = next ? clamp((inLevel / span) * 100, 0, 100) : 100;

  return {
    current,
    next,
    progress,
    toNext: next ? Math.max(0, next.min - p) : 0,
    curMin,
    nextMin,
  };
}
