"use client";

import { useEffect, useMemo, useState } from "react";

type StatsPayload =
  | { ok: false; error: string }
  | {
      ok: true;
      stats: {
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
      };
    };

type MePayload =
  | { ok: false; error: string }
  | { ok: true; id: string; name: string | null; points: number };

type Level = {
  key: string;
  name: string;
  min: number;
  desc?: string;
};

const LEVELS: Level[] = [
  { key: "new", name: "Nuovo", min: 0, desc: "Appena arrivato" },
  { key: "curioso", name: "Curioso", min: 20, desc: "In esplorazione" },
  { key: "explorer", name: "Explorer", min: 60, desc: "Gira gli spot" },
  { key: "regular", name: "Regular", min: 120, desc: "Presenza costante" },
  { key: "veteran", name: "Veterano", min: 200, desc: "Ormai di casa" },
  { key: "legend", name: "Leggenda", min: 320, desc: "Top player" },
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatInt(n: number) {
  return (Number(n) || 0).toLocaleString("it-IT");
}

function getLevel(points: number) {
  const p = Number(points) || 0;
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (p >= lvl.min) current = lvl;
  }
  const idx = LEVELS.findIndex((l) => l.key === current.key);
  const next = idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;

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

function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="notice"
      style={{
        padding: 16,
        borderRadius: 18,
        border: "1px dashed rgba(0,0,0,0.12)",
        background: "rgba(255,255,255,0.6)",
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>{title}</div>
          {subtitle ? <div style={{ opacity: 0.72, marginTop: 4 }}>{subtitle}</div> : null}
        </div>
        {right ?? null}
      </div>
      {children}
    </div>
  );
}

/** ---- Rewards / Badge Cards ---- */
type BadgeDef = {
  id: string;
  title: string;
  desc: string;
  icon: string; // emoji per ora
  // ritorna progress (0..1), unlocked boolean e label
  compute: (s: Stats) => { progress01: number; unlocked: boolean; label: string };
  rarity?: "common" | "rare" | "epic";
};

type Stats = NonNullable<StatsPayload extends { ok: true; stats: infer T } ? T : never>;

function rarityStyles(r?: BadgeDef["rarity"]) {
  // no colors hardcoded? qui uso solo gradient neutro, ma differenzio bordi/shadow
  const base = {
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  };
  if (r === "rare") return { ...base, border: "1px solid rgba(0,0,0,0.12)" };
  if (r === "epic") return { ...base, border: "1px solid rgba(0,0,0,0.16)" };
  return base;
}

function BadgeCard({
  def,
  s,
}: {
  def: BadgeDef;
  s: Stats;
}) {
  const r = def.compute(s);
  const pct = Math.round(clamp(r.progress01 * 100, 0, 100));

  return (
    <div
      style={{
        borderRadius: 18,
        background: "rgba(255,255,255,0.78)",
        padding: 14,
        display: "grid",
        gap: 10,
        position: "relative",
        overflow: "hidden",
        ...rarityStyles(def.rarity),
        opacity: r.unlocked ? 1 : 0.82,
        filter: r.unlocked ? "none" : "grayscale(0.12)",
      }}
      title={r.unlocked ? "Badge sbloccato" : "Badge bloccato"}
    >
      {/* top row */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.85)",
              display: "grid",
              placeItems: "center",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            {def.icon}
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 950, fontSize: 15, lineHeight: 1.1 }}>{def.title}</div>
            <div style={{ opacity: 0.72, fontSize: 13, lineHeight: 1.25 }}>{def.desc}</div>
          </div>
        </div>

        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.85)",
            fontSize: 12,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          {r.unlocked ? "✅ Sbloccato" : "🔒 Bloccato"}
        </span>
      </div>

      {/* progress */}
      <div style={{ display: "grid", gap: 7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, opacity: 0.75 }}>
          <div style={{ fontWeight: 900 }}>{r.label}</div>
          <div style={{ fontWeight: 900 }}>{pct}%</div>
        </div>

        <div style={{ height: 10, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #6b7cff, #ff4fb8)",
            }}
          />
        </div>
      </div>

      {/* subtle corner */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -40,
          bottom: -40,
          width: 120,
          height: 120,
          borderRadius: 999,
          background: "rgba(0,0,0,0.03)",
        }}
      />
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(255,255,255,0.7)",
        fontSize: 13,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: "linear-gradient(90deg, #6b7cff, #ff4fb8)",
          display: "inline-block",
        }}
      />
      <b style={{ fontWeight: 900 }}>{label}:</b>
      <span style={{ opacity: 0.85, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.06)",
        background: "rgba(255,255,255,0.75)",
        borderRadius: 16,
        padding: 14,
        minHeight: 88,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 900, opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.5 }}>{value}</div>
      {subtitle ? <div style={{ fontSize: 13, opacity: 0.7 }}>{subtitle}</div> : null}
    </div>
  );
}

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [me, setMe] = useState<MePayload | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll(silent = false) {
    if (!silent) {
      setLoading(true);
      setErr(null);
    } else {
      setRefreshing(true);
      setErr(null);
    }

    try {
      const [meRes, stRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/profile/stats", { cache: "no-store" }),
      ]);

      const meJson = (await meRes.json()) as MePayload;
      const stJson = (await stRes.json()) as StatsPayload;

      setMe(meJson);
      setStats(stJson);

      if (!meJson?.ok) setErr(meJson?.error ?? "Errore /api/me");
      else if (!stJson?.ok) setErr(stJson?.error ?? "Errore /api/profile/stats");
      else setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Errore di rete");
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadAll(false);
  }, []);

  const s = stats && stats.ok ? stats.stats : null;

  const points = useMemo(() => {
    if (s) return Number(s.points_total ?? 0) || 0;
    if (me && me.ok) return Number(me.points ?? 0) || 0;
    return 0;
  }, [s, me]);

  const levelInfo = useMemo(() => getLevel(points), [points]);

  const nickname = me && me.ok ? (me.name ?? "Guest") : "—";
  const userId = me && me.ok ? me.id : "—";

  // Badge definitions (REWARDS)
  const BADGES: BadgeDef[] = useMemo(() => {
    if (!s) return [];

    const badgeList: BadgeDef[] = [
      {
        id: "first_scan",
        title: "Primo Scan",
        desc: "Fai il tuo primo scan in uno spot.",
        icon: "✨",
        rarity: "common",
        compute: (st) => {
          const v = st.scans_total;
          return {
            progress01: clamp(v / 1, 0, 1),
            unlocked: v >= 1,
            label: `${v}/1 scan`,
          };
        },
      },
      {
        id: "explorer_5",
        title: "Esploratore",
        desc: "Visita 5 spot diversi.",
        icon: "🧭",
        rarity: "common",
        compute: (st) => {
          const v = st.venues_visited;
          return {
            progress01: clamp(v / 5, 0, 1),
            unlocked: v >= 5,
            label: `${v}/5 spot`,
          };
        },
      },
      {
        id: "explorer_10",
        title: "Giro Lungo",
        desc: "Visita 10 spot diversi.",
        icon: "🗺️",
        rarity: "rare",
        compute: (st) => {
          const v = st.venues_visited;
          return {
            progress01: clamp(v / 10, 0, 1),
            unlocked: v >= 10,
            label: `${v}/10 spot`,
          };
        },
      },
      {
        id: "streak_3",
        title: "Costante",
        desc: "Streak di 3 giorni consecutivi con almeno 1 scan.",
        icon: "🔥",
        rarity: "common",
        compute: (st) => {
          const v = st.streak_days;
          return {
            progress01: clamp(v / 3, 0, 1),
            unlocked: v >= 3,
            label: `${v}/3 giorni`,
          };
        },
      },
      {
        id: "streak_7",
        title: "Inarrestabile",
        desc: "Streak di 7 giorni consecutivi.",
        icon: "💥",
        rarity: "epic",
        compute: (st) => {
          const v = st.streak_days;
          return {
            progress01: clamp(v / 7, 0, 1),
            unlocked: v >= 7,
            label: `${v}/7 giorni`,
          };
        },
      },
      {
        id: "weekly_10",
        title: "Settimana Attiva",
        desc: "Fai 10 scan negli ultimi 7 giorni.",
        icon: "📈",
        rarity: "rare",
        compute: (st) => {
          const v = st.last7_scans;
          return {
            progress01: clamp(v / 10, 0, 1),
            unlocked: v >= 10,
            label: `${v}/10 scan`,
          };
        },
      },
      {
        id: "points_200",
        title: "200 Punti",
        desc: "Raggiungi 200 punti totali.",
        icon: "🏅",
        rarity: "rare",
        compute: (st) => {
          const v = st.points_total;
          return {
            progress01: clamp(v / 200, 0, 1),
            unlocked: v >= 200,
            label: `${formatInt(v)}/200 pt`,
          };
        },
      },
      {
        id: "points_500",
        title: "500 Punti",
        desc: "Raggiungi 500 punti totali.",
        icon: "👑",
        rarity: "epic",
        compute: (st) => {
          const v = st.points_total;
          return {
            progress01: clamp(v / 500, 0, 1),
            unlocked: v >= 500,
            label: `${formatInt(v)}/500 pt`,
          };
        },
      },
    ];

    return badgeList;
  }, [s]);

  const unlockedCount = useMemo(() => {
    if (!s) return 0;
    return BADGES.filter((b) => b.compute(s).unlocked).length;
  }, [BADGES, s]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px", display: "grid", gap: 14 }}>
      {/* Header */}
      <Section
        title="Il mio profilo"
        subtitle="Rewards, streak, livelli e statistiche."
        right={
          <button className="btn" onClick={() => loadAll(true)} disabled={refreshing} style={{ height: 38 }}>
            {refreshing ? "Aggiorno..." : "Aggiorna"}
          </button>
        }
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Utente</div>
            <div style={{ opacity: 0.78 }}>
              <b>{nickname}</b> <span style={{ opacity: 0.6 }}>(ID: {userId})</span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ opacity: 0.7, fontWeight: 900 }}>Punti (profilo)</div>
            <div style={{ fontSize: 30, fontWeight: 950 }}>{formatInt(points)}</div>
          </div>
        </div>

        {err ? (
          <div className="notice" style={{ padding: 12, borderRadius: 14 }}>
            Errore: {err}
          </div>
        ) : null}
      </Section>

      {/* Livello (card dedicata) */}
      <Section title="Livello" subtitle="Progress e prossimo livello.">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>
                {LEVELS.findIndex((x) => x.key === levelInfo.current.key) + 1} • {levelInfo.current.name}
              </div>
              <div style={{ opacity: 0.7, marginTop: 4 }}>{levelInfo.current.desc ?? ""}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ opacity: 0.7, fontWeight: 900 }}>{levelInfo.next ? "Mancano" : "Top"}</div>
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                {levelInfo.next ? `${formatInt(levelInfo.toNext)} pt` : "✅"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.8 }}>
            <div style={{ fontWeight: 900 }}>
              {levelInfo.next ? (
                <>Prossimo: <b>{levelInfo.next.name}</b> (da {formatInt(levelInfo.next.min)} pt)</>
              ) : (
                <>Livello massimo raggiunto ✅</>
              )}
            </div>
            <div style={{ fontWeight: 900 }}>
              {levelInfo.next ? (
                <>
                  {formatInt(points - levelInfo.curMin)}/{formatInt(levelInfo.nextMin - levelInfo.curMin)}
                </>
              ) : (
                "100%"
              )}
            </div>
          </div>

          <div style={{ height: 10, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div
              style={{
                width: `${levelInfo.progress}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #6b7cff, #ff4fb8)",
              }}
            />
          </div>
        </div>
      </Section>

      {/* Rewards / Badge Cards */}
      <Section
        title="Badge (Rewards)"
        subtitle="Questi sono i tuoi obiettivi sbloccabili."
        right={
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.75)",
              fontWeight: 950,
              whiteSpace: "nowrap",
            }}
            title="Badge sbloccati"
          >
            🏆 {unlockedCount}/{BADGES.length}
          </div>
        }
      >
        {!s ? (
          <div style={{ opacity: 0.7 }}>Caricamento badge...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            {BADGES.map((b) => (
              <BadgeCard key={b.id} def={b} s={s} />
            ))}
          </div>
        )}
      </Section>

      {/* Oggi & Stats rapide (chips, NON badge) */}
      <Section title="Oggi & Stats rapide" subtitle="Solo numeri veloci (non rewards).">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <StatChip label="Presenze oggi" value={s ? s.scans_today : "—"} />
          <StatChip label="Scontrini oggi" value={s ? s.receipts_today : "—"} />
          <StatChip label="Voti oggi" value={s ? s.votes_today : "—"} />
          <StatChip label="Streak" value={s ? `${s.streak_days}g` : "—"} />
          <StatChip label="Best" value={s ? `${s.best_streak_days}g` : "—"} />
          <StatChip label="Scan totali" value={s ? s.scans_total : "—"} />
          <StatChip label="Spot visitati" value={s ? s.venues_visited : "—"} />
          <StatChip label="Ultimi 7 giorni" value={s ? `${s.last7_scans} scan • ${s.last7_points} pt` : "—"} />
        </div>
      </Section>

      {/* Overview cards */}
      <Section title="Overview" subtitle="Dati principali">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Card title="Punti totali" value={formatInt(points)} subtitle="Dal profilo (sc_users.points)" />
          <Card title="Scan totali" value={formatInt(s?.scans_total ?? 0)} subtitle="Eventi tipo scan" />
          <Card title="Spot visitati" value={formatInt(s?.venues_visited ?? 0)} subtitle="Distinct venue_id sugli scan" />
          <Card
            title="Ultimi 7 giorni"
            value={`${formatInt(s?.last7_scans ?? 0)} scan • ${formatInt(s?.last7_points ?? 0)} pt`}
            subtitle="Somma points_delta (tutti eventi)"
          />
        </div>
      </Section>

      {/* Debug */}
      <Section title="Azioni rapide" subtitle="Dati grezzi (debug).">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href="/api/profile/stats" target="_blank" rel="noreferrer">
            Apri JSON stats
          </a>
          <a className="btn" href="/api/me" target="_blank" rel="noreferrer">
            Apri JSON me
          </a>
        </div>

        {loading ? <div style={{ opacity: 0.7 }}>Caricamento...</div> : null}
      </Section>

      <div style={{ textAlign: "center", opacity: 0.65, padding: "10px 0" }}>© 2026 SocialCraft</div>
    </div>
  );
}