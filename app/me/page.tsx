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
  // opzionale: descrizione breve
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

function Badge({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div
      className="badge"
      title={hint}
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
      <b style={{ fontWeight: 800 }}>{label}:</b>
      <span style={{ opacity: 0.85, fontWeight: 700 }}>{value}</span>
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
      <div style={{ fontWeight: 800, opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>{value}</div>
      {subtitle ? <div style={{ fontSize: 13, opacity: 0.7 }}>{subtitle}</div> : null}
    </div>
  );
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
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          {subtitle ? <div style={{ opacity: 0.7, marginTop: 4 }}>{subtitle}</div> : null}
        </div>
        {right ?? null}
      </div>
      {children}
    </div>
  );
}

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [me, setMe] = useState<MePayload | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const points = useMemo(() => {
    if (stats && stats.ok) return Number(stats.stats.points_total ?? 0) || 0;
    if (me && me.ok) return Number(me.points ?? 0) || 0;
    return 0;
  }, [me, stats]);

  const levelInfo = useMemo(() => getLevel(points), [points]);

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

  const nickname = me && me.ok ? (me.name ?? "Guest") : "—";
  const userId = me && me.ok ? me.id : "—";

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px", display: "grid", gap: 14 }}>
      {/* Header */}
      <Section
        title="Il mio profilo"
        subtitle="Badge, streak, livelli e statistiche."
        right={
          <button
            className="btn"
            onClick={() => loadAll(true)}
            disabled={refreshing}
            style={{ height: 38 }}
          >
            {refreshing ? "Aggiorno..." : "Aggiorna"}
          </button>
        }
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Utente</div>
            <div style={{ opacity: 0.75 }}>
              <b>{nickname}</b> <span style={{ opacity: 0.6 }}>(ID: {userId})</span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ opacity: 0.7, fontWeight: 800 }}>Punti (profilo)</div>
            <div style={{ fontSize: 30, fontWeight: 950 }}>{formatInt(points)}</div>
          </div>
        </div>

        {err ? (
          <div className="notice" style={{ padding: 12, borderRadius: 14 }}>
            Errore: {err}
          </div>
        ) : null}
      </Section>

      {/* Badges + Level */}
      <Section
        title="Badge"
        subtitle="Oggi, streak e livello."
        right={
          <div
            style={{
              display: "inline-flex",
              gap: 10,
              alignItems: "center",
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.7)",
              fontWeight: 900,
            }}
            title="Punti totali"
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background: "linear-gradient(90deg, #6b7cff, #ff4fb8)",
                display: "inline-block",
              }}
            />
            {formatInt(points)} pt
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Badge label="Presenze oggi" value={s ? s.scans_today : "—"} />
          <Badge label="Scontrini oggi" value={s ? s.receipts_today : "—"} />
          <Badge label="Voti oggi" value={s ? s.votes_today : "—"} />

          <Badge label="Streak" value={s ? `${s.streak_days}g` : "—"} hint="Giorni consecutivi con almeno 1 scan" />
          <Badge label="Best" value={s ? `${s.best_streak_days}g` : "—"} hint="Miglior streak storico" />

          <Badge label="Scan totali" value={s ? s.scans_total : "—"} />
          <Badge label="Spot visitati" value={s ? s.venues_visited : "—"} />
          <Badge
            label="Livello"
            value={`${LEVELS.findIndex((x) => x.key === levelInfo.current.key) + 1} • ${levelInfo.current.name}`}
            hint={levelInfo.current.desc}
          />
        </div>

        {/* Progress */}
        <div style={{ marginTop: 6, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.8 }}>
            <div style={{ fontWeight: 900 }}>
              {levelInfo.next ? (
                <>
                  Prossimo livello: <b>{formatInt(levelInfo.toNext)} pt</b>
                </>
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
                <>100%</>
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

          {levelInfo.next ? (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Ora: <b>{levelInfo.current.name}</b> → Prossimo: <b>{levelInfo.next.name}</b> (da {formatInt(levelInfo.next.min)} pt)
            </div>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Sei al top: <b>{levelInfo.current.name}</b>. 🔥
            </div>
          )}
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

        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.7 }}>
          Nota: “Punti totali” viene da <code>/api/profile/stats</code> (campo <code>stats.points_total</code>).
        </div>
      </Section>

      {/* Quick actions / info */}
      <Section title="Azioni rapide" subtitle="Se qualcosa non torna, qui trovi i dati grezzi.">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href="/api/profile/stats" target="_blank" rel="noreferrer">
            Apri JSON stats
          </a>
          <a className="btn" href="/api/me" target="_blank" rel="noreferrer">
            Apri JSON me
          </a>
        </div>

        {loading ? <div className="muted">Caricamento...</div> : null}
      </Section>

      <div style={{ textAlign: "center", opacity: 0.65, padding: "10px 0" }}>© 2026 SocialCraft</div>
    </div>
  );
}