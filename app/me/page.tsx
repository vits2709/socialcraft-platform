"use client";

import { useEffect, useMemo, useState } from "react";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import { getExplorerLevel } from "@/lib/levels";

type Stats = {
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

type StatsPayload =
  | { ok: false; error: string }
  | {
      ok: true;
      stats: Stats;
    };

type MePayload =
  | { ok: false; error: string }
  | {
      ok: true;
      user: { id: string; name: string | null; points: number; updated_at: string };
      last_events: Array<{
        event_type: string;
        points: number;
        points_delta: number;
        created_at: string;
        venue_id: string | null;
      }>;
    };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatInt(n: number) {
  return (Number(n) || 0).toLocaleString("it-IT");
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

type BadgeDef = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  compute: (s: Stats) => { progress01: number; unlocked: boolean; label: string };
  rarity?: "common" | "rare" | "epic";
};

function rarityStyles(r?: BadgeDef["rarity"]) {
  const base = {
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  };
  if (r === "rare") return { ...base, border: "1px solid rgba(0,0,0,0.12)" };
  if (r === "epic") return { ...base, border: "1px solid rgba(0,0,0,0.16)" };
  return base;
}

function BadgeCard({ def, s }: { def: BadgeDef; s: Stats }) {
  const r = def.compute(s);
  const pct = Math.round(clamp(r.progress01 * 100, 0, 100));

  return (
    <div
      style={{
        borderRadius: 18,
        background: "rgba(255,255,255,0.78)",
        padding: 16,
        display: "grid",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        ...rarityStyles(def.rarity),
        opacity: r.unlocked ? 1 : 0.82,
        filter: r.unlocked ? "none" : "grayscale(0.12)",
      }}
      title={r.unlocked ? "Badge sbloccato" : "Badge bloccato"}
    >
      {/* Riga superiore: icona + testi + badge lock */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
        {/* Icona */}
        <div
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
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

        {/* Titolo + descrizione — wrappano liberamente */}
        <div style={{ display: "grid", gap: 4, flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 15, lineHeight: 1.2, wordBreak: "break-word" }}>
            {def.title}
          </div>
          <div style={{ opacity: 0.72, fontSize: 13, lineHeight: 1.35, wordBreak: "break-word" }}>
            {def.desc}
          </div>
        </div>

        {/* Badge sbloccato / bloccato */}
        <span
          style={{
            flexShrink: 0,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.85)",
            fontSize: 12,
            fontWeight: 900,
            whiteSpace: "nowrap",
            alignSelf: "flex-start",
          }}
        >
          {r.unlocked ? "✅" : "🔒"}
        </span>
      </div>

      {/* Barra di progresso */}
      <div style={{ display: "grid", gap: 6 }}>
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

      {/* Cerchio decorativo */}
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
          pointerEvents: "none",
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

export default function MePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [me, setMe] = useState<MePayload | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [nickInput, setNickInput] = useState("");
  const [nickSaving, setNickSaving] = useState(false);
  const [nickErr, setNickErr] = useState<string | null>(null);

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

  async function saveNickname() {
    const name = nickInput.trim();
    if (name.length < 2) { setNickErr("Minimo 2 caratteri"); return; }
    if (name.length > 24) { setNickErr("Massimo 24 caratteri"); return; }

    setNickSaving(true);
    setNickErr(null);
    try {
      const res = await fetch("/api/me/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.ok) { setNickErr(json.error ?? "Errore salvataggio"); return; }
      await loadAll(true);
    } catch (e: any) {
      setNickErr(e?.message ?? "Errore di rete");
    } finally {
      setNickSaving(false);
    }
  }

  useEffect(() => {
    loadAll(false);
  }, []);

  const s = stats && stats.ok ? stats.stats : null;

  const points = useMemo(() => {
    if (s) return Number(s.points_total ?? 0) || 0;
    if (me && me.ok) return Number(me.user.points ?? 0) || 0;
    return 0;
  }, [s, me]);

  const levelInfo = useMemo(() => getExplorerLevel(points), [points]);

  const nickname = me && me.ok ? (me.user.name ?? null) : null;
  const hasNickname = !!nickname;

  const BADGES: BadgeDef[] = useMemo(() => {
    if (!s) return [];

    return [
      {
        id: "first_scan",
        title: "Primo Scan",
        desc: "Fai il tuo primo scan in uno spot.",
        icon: "✨",
        rarity: "common",
        compute: (st) => {
          const v = st.scans_total;
          return { progress01: clamp(v / 1, 0, 1), unlocked: v >= 1, label: `${v}/1 scan` };
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
          return { progress01: clamp(v / 5, 0, 1), unlocked: v >= 5, label: `${v}/5 spot` };
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
          return { progress01: clamp(v / 10, 0, 1), unlocked: v >= 10, label: `${v}/10 spot` };
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
          return { progress01: clamp(v / 3, 0, 1), unlocked: v >= 3, label: `${v}/3 giorni` };
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
          return { progress01: clamp(v / 7, 0, 1), unlocked: v >= 7, label: `${v}/7 giorni` };
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
          return { progress01: clamp(v / 10, 0, 1), unlocked: v >= 10, label: `${v}/10 scan` };
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
          return { progress01: clamp(v / 200, 0, 1), unlocked: v >= 200, label: `${formatInt(v)}/200 pt` };
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
          return { progress01: clamp(v / 500, 0, 1), unlocked: v >= 500, label: `${formatInt(v)}/500 pt` };
        },
      },
    ];
  }, [s]);

  const unlockedCount = useMemo(() => {
    if (!s) return 0;
    return BADGES.filter((b) => b.compute(s).unlocked).length;
  }, [BADGES, s]);

  if (loading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "80px 14px", textAlign: "center" }}>
        <div style={{ opacity: 0.6, fontSize: 15 }}>Caricamento profilo...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px", display: "grid", gap: 14 }}>
      {/* Richiesta permesso notifiche */}
      <PushNotificationSetup />

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
            {hasNickname ? (
              <div style={{ opacity: 0.78 }}>
                <b>{nickname}</b>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ opacity: 0.6, fontSize: 13 }}>Scegli il tuo nickname — non potrai cambiarlo in seguito.</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Il tuo nickname"
                    value={nickInput}
                    onChange={(e) => setNickInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveNickname(); }}
                    maxLength={24}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.15)",
                      fontSize: 14,
                      fontWeight: 800,
                      outline: "none",
                      background: "rgba(255,255,255,0.9)",
                      minWidth: 180,
                    }}
                  />
                  <button
                    className="btn"
                    onClick={saveNickname}
                    disabled={nickSaving || nickInput.trim().length < 2}
                    style={{ height: 36 }}
                  >
                    {nickSaving ? "Salvo..." : "Salva"}
                  </button>
                </div>
                {nickErr ? (
                  <div style={{ fontSize: 13, color: "red", opacity: 0.8 }}>{nickErr}</div>
                ) : null}
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ opacity: 0.7, fontWeight: 900 }}>Punti</div>
            <div style={{ fontSize: 30, fontWeight: 950 }}>{formatInt(points)}</div>
          </div>
        </div>

        {err ? (
          <div className="notice" style={{ padding: 12, borderRadius: 14 }}>
            Errore: {err}
          </div>
        ) : null}
      </Section>

      <Section title="Livello" subtitle="Progress e prossimo livello.">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>
                {levelInfo.current.name}
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

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, opacity: 0.8 }}>
            <div style={{ fontWeight: 900 }}>
              {levelInfo.next ? (
                <>
                  Prossimo: <b>{levelInfo.next.name}</b> (da {formatInt(levelInfo.next.min)} pt)
                </>
              ) : (
                <>Livello massimo raggiunto ✅</>
              )}
            </div>
            <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>
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
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {BADGES.map((b) => (
              <BadgeCard key={b.id} def={b} s={s} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Statistiche" subtitle="Le tue attività in sintesi.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <StatChip label="Presenze oggi" value={s ? s.scans_today : "—"} />
          <StatChip label="Scontrini oggi" value={s ? s.receipts_today : "—"} />
          <StatChip label="Voti oggi" value={s ? s.votes_today : "—"} />
          <StatChip label="Streak" value={s ? `${s.streak_days}g` : "—"} />
          <StatChip label="Best streak" value={s ? `${s.best_streak_days}g` : "—"} />
          <StatChip label="Scan totali" value={s ? s.scans_total : "—"} />
          <StatChip label="Spot visitati" value={s ? s.venues_visited : "—"} />
          <StatChip label="Ultimi 7 giorni" value={s ? `${s.last7_scans} scan • ${s.last7_points} pt` : "—"} />
        </div>
      </Section>

    </div>
  );
}
