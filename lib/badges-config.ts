// Fonte di verità unica per badge e rarità.
// Usato da /api/badges e da app/me/page.tsx.

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export type BadgeStats = {
  points_total: number;
  scans_today: number;
  receipts_today: number;
  votes_today: number;
  scans_total: number;
  venues_visited: number;
  streak_days: number;
  best_streak_days: number;
  last_scan_day: string | null;
  last7_days: number;
  last7_scans: number;
  last7_points: number;
  receipts_total: number;
  votes_total: number;
  group_checkins: number;
};

export type BadgeDef = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  rarity: BadgeRarity;
  /** Se true e non sbloccato: mostra "???" + secretHint, nasconde la progress bar */
  secret?: boolean;
  secretHint?: string;
  compute: (s: BadgeStats) => { progress01: number; unlocked: boolean; label: string };
};

export const BADGE_DEFS: BadgeDef[] = [
  // ─── COMUNI 🔵 (4) ───────────────────────────────────────────────────
  {
    id: "first_scan",
    name: "Primo Scan",
    icon: "✨",
    desc: "Fai il tuo primo scan in uno spot.",
    rarity: "common",
    compute: (s) => {
      const v = s.scans_total;
      return { progress01: Math.min(v / 1, 1), unlocked: v >= 1, label: `${v}/1 scan` };
    },
  },
  {
    id: "first_vote",
    name: "Prima Opinione",
    icon: "💬",
    desc: "Dai il tuo primo voto a uno spot.",
    rarity: "common",
    compute: (s) => {
      const v = s.votes_total ?? 0;
      return { progress01: Math.min(v / 1, 1), unlocked: v >= 1, label: `${v}/1 voto` };
    },
  },
  {
    id: "explorer_3",
    name: "Curioso",
    icon: "👀",
    desc: "Visita 3 spot diversi.",
    rarity: "common",
    compute: (s) => {
      const v = s.venues_visited;
      return { progress01: Math.min(v / 3, 1), unlocked: v >= 3, label: `${v}/3 spot` };
    },
  },
  {
    id: "streak_3",
    name: "Costante",
    icon: "🔥",
    desc: "Streak di 3 giorni consecutivi.",
    rarity: "common",
    compute: (s) => {
      const v = s.streak_days;
      return { progress01: Math.min(v / 3, 1), unlocked: v >= 3, label: `${v}/3 giorni` };
    },
  },

  // ─── RARI 🟣 (5) ─────────────────────────────────────────────────────
  {
    id: "explorer_5",
    name: "Esploratore",
    icon: "🧭",
    desc: "Visita 5 spot diversi.",
    rarity: "rare",
    compute: (s) => {
      const v = s.venues_visited;
      return { progress01: Math.min(v / 5, 1), unlocked: v >= 5, label: `${v}/5 spot` };
    },
  },
  {
    id: "points_150",
    name: "Punti di Merito",
    icon: "🏅",
    desc: "Raggiungi 150 punti totali.",
    rarity: "rare",
    compute: (s) => {
      const v = s.points_total;
      return { progress01: Math.min(v / 150, 1), unlocked: v >= 150, label: `${v}/150 pt` };
    },
  },
  {
    id: "weekly_10",
    name: "Settimana Attiva",
    icon: "📈",
    desc: "10 scan negli ultimi 7 giorni.",
    rarity: "rare",
    compute: (s) => {
      const v = s.last7_scans;
      return { progress01: Math.min(v / 10, 1), unlocked: v >= 10, label: `${v}/10 scan` };
    },
  },
  {
    id: "receipts_3",
    name: "Buon Cliente",
    icon: "🧾",
    desc: "Invia 3 scontrini verificati.",
    rarity: "rare",
    compute: (s) => {
      const v = s.receipts_total ?? 0;
      return { progress01: Math.min(v / 3, 1), unlocked: v >= 3, label: `${v}/3 scontrini` };
    },
  },
  {
    id: "scans_25",
    name: "Presenze",
    icon: "📍",
    desc: "Fai 25 scan in totale.",
    rarity: "rare",
    compute: (s) => {
      const v = s.scans_total;
      return { progress01: Math.min(v / 25, 1), unlocked: v >= 25, label: `${v}/25 scan` };
    },
  },

  // ─── EPICI 🟠 (6) ─────────────────────────────────────────────────────
  {
    id: "explorer_10",
    name: "Giro Lungo",
    icon: "🗺️",
    desc: "Visita 10 spot diversi.",
    rarity: "epic",
    compute: (s) => {
      const v = s.venues_visited;
      return { progress01: Math.min(v / 10, 1), unlocked: v >= 10, label: `${v}/10 spot` };
    },
  },
  {
    id: "streak_7",
    name: "Inarrestabile",
    icon: "💥",
    desc: "Streak di 7 giorni consecutivi.",
    rarity: "epic",
    compute: (s) => {
      const v = s.streak_days;
      return { progress01: Math.min(v / 7, 1), unlocked: v >= 7, label: `${v}/7 giorni` };
    },
  },
  {
    id: "points_300",
    name: "Trecento",
    icon: "🎯",
    desc: "Raggiungi 300 punti totali.",
    rarity: "epic",
    compute: (s) => {
      const v = s.points_total;
      return { progress01: Math.min(v / 300, 1), unlocked: v >= 300, label: `${v}/300 pt` };
    },
  },
  {
    id: "weekly_25",
    name: "Maniaco Settimanale",
    icon: "⚡",
    desc: "25 scan negli ultimi 7 giorni.",
    rarity: "epic",
    compute: (s) => {
      const v = s.last7_scans;
      return { progress01: Math.min(v / 25, 1), unlocked: v >= 25, label: `${v}/25 scan` };
    },
  },
  {
    id: "scans_50",
    name: "Cinquanta Presenze",
    icon: "🌟",
    desc: "Fai 50 scan in totale.",
    rarity: "epic",
    compute: (s) => {
      const v = s.scans_total;
      return { progress01: Math.min(v / 50, 1), unlocked: v >= 50, label: `${v}/50 scan` };
    },
  },
  {
    id: "votes_10",
    name: "Critico",
    icon: "⭐",
    desc: "Dai 10 voti a spot diversi.",
    rarity: "epic",
    compute: (s) => {
      const v = s.votes_total ?? 0;
      return { progress01: Math.min(v / 10, 1), unlocked: v >= 10, label: `${v}/10 voti` };
    },
  },

  // ─── LEGGENDARI 🔴 — tutti segreti (8) ───────────────────────────────
  {
    id: "best_streak_30",
    name: "Il Custode",
    icon: "🌙",
    desc: "Hai mantenuto una streak record di 30 giorni consecutivi.",
    rarity: "legendary",
    secret: true,
    secretHint: "Il silenzio delle notti di fila racconta storie...",
    compute: (s) => {
      const v = s.best_streak_days;
      return { progress01: Math.min(v / 30, 1), unlocked: v >= 30, label: `${v}/30 giorni` };
    },
  },
  {
    id: "venues_30",
    name: "Il Nomade",
    icon: "🏙️",
    desc: "Hai visitato 30 spot diversi nella città.",
    rarity: "legendary",
    secret: true,
    secretHint: "Hai toccato ogni angolo, eppure non ti fermi.",
    compute: (s) => {
      const v = s.venues_visited;
      return { progress01: Math.min(v / 30, 1), unlocked: v >= 30, label: `${v}/30 spot` };
    },
  },
  {
    id: "points_500",
    name: "La Leggenda",
    icon: "👑",
    desc: "Raggiungi 500 punti totali.",
    rarity: "legendary",
    secret: true,
    secretHint: "I numeri non mentono mai.",
    compute: (s) => {
      const v = s.points_total;
      return { progress01: Math.min(v / 500, 1), unlocked: v >= 500, label: `${v}/500 pt` };
    },
  },
  {
    id: "weekly_40",
    name: "Il Fuoco Sacro",
    icon: "🔱",
    desc: "40 scan in una sola settimana.",
    rarity: "legendary",
    secret: true,
    secretHint: "Una settimana che brucia ancora.",
    compute: (s) => {
      const v = s.last7_scans;
      return { progress01: Math.min(v / 40, 1), unlocked: v >= 40, label: `${v}/40 scan` };
    },
  },
  {
    id: "streak_21",
    name: "Il Fedele",
    icon: "💎",
    desc: "Streak attiva di 21 giorni consecutivi.",
    rarity: "legendary",
    secret: true,
    secretHint: "La fedeltà ha il peso dell'oro.",
    compute: (s) => {
      const v = s.streak_days;
      return { progress01: Math.min(v / 21, 1), unlocked: v >= 21, label: `${v}/21 giorni` };
    },
  },
  {
    id: "receipts_15",
    name: "Il Mecenate",
    icon: "💸",
    desc: "Invia 15 scontrini verificati.",
    rarity: "legendary",
    secret: true,
    secretHint: "Ogni euro racconta una storia di fiducia.",
    compute: (s) => {
      const v = s.receipts_total ?? 0;
      return { progress01: Math.min(v / 15, 1), unlocked: v >= 15, label: `${v}/15 scontrini` };
    },
  },
  {
    id: "votes_25",
    name: "La Voce",
    icon: "📣",
    desc: "Dai 25 voti a spot diversi.",
    rarity: "legendary",
    secret: true,
    secretHint: "Chi conosce tutto, giudica tutto.",
    compute: (s) => {
      const v = s.votes_total ?? 0;
      return { progress01: Math.min(v / 25, 1), unlocked: v >= 25, label: `${v}/25 voti` };
    },
  },
  {
    id: "scans_100",
    name: "Il Centurione",
    icon: "⚔️",
    desc: "Fai 100 scan in totale.",
    rarity: "legendary",
    secret: true,
    secretHint: "Cento volte presente, mai assente.",
    compute: (s) => {
      const v = s.scans_total;
      return { progress01: Math.min(v / 100, 1), unlocked: v >= 100, label: `${v}/100 scan` };
    },
  },

  // ─── COMUNE SPECIALE — companion ─────────────────────────────────────
  {
    id: "in_compagnia",
    name: "In Compagnia",
    icon: "👥",
    desc: "Fai un check-in di gruppo con il codice companion.",
    rarity: "common",
    compute: (s) => {
      const v = s.group_checkins ?? 0;
      return { progress01: Math.min(v / 1, 1), unlocked: v >= 1, label: v >= 1 ? "sbloccato" : "0/1" };
    },
  },
];
