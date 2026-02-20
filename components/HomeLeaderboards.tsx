"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LBRow } from "@/app/page";
import { getExplorerLevel } from "@/lib/levels";

function toInt(n: any) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function toNum(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : NaN;
}

function fmtRating(avg: any) {
  const n = toNum(avg);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

/* Livelli spot (indipendenti dagli esploratori, rimangono locali) */
type SpotLevel = { label: string; emoji: string; nextAt: number | null };

function spotLevel(points: number): SpotLevel {
  if (points < 20)  return { label: "Nuovo",      emoji: "🌱", nextAt: 20 };
  if (points < 60)  return { label: "In Crescita", emoji: "📈", nextAt: 60 };
  if (points < 150) return { label: "Hot",         emoji: "🔥", nextAt: 150 };
  if (points < 350) return { label: "Iconico",     emoji: "✨", nextAt: 350 };
  return { label: "Leggenda", emoji: "👑", nextAt: null };
}

function prevAtForSpot(label: string) {
  if (label === "Nuovo")      return 0;
  if (label === "In Crescita") return 20;
  if (label === "Hot")        return 60;
  if (label === "Iconico")    return 150;
  return 350;
}

function spotProgressPct(points: number, lvl: SpotLevel, prevAt: number) {
  if (lvl.nextAt == null) return 100;
  const span = Math.max(1, lvl.nextAt - prevAt);
  const cur = Math.min(span, Math.max(0, points - prevAt));
  return Math.round((cur / span) * 100);
}

export type WeeklyRow = {
  user_id: string;
  user_name: string | null;
  points_week: number;
  rank: number;
};

export default function HomeLeaderboards(props: {
  spots: LBRow[];
  explorers: LBRow[];
  weeklyExplorers?: WeeklyRow[];
}) {
  const [tab, setTab] = useState<"spots" | "explorers" | "weekly">("spots");

  const topSpots = useMemo(() => props.spots.slice(0, 20), [props.spots]);
  const topExplorers = useMemo(() => props.explorers.slice(0, 20), [props.explorers]);
  const topWeekly = useMemo(() => (props.weeklyExplorers ?? []).slice(0, 20), [props.weeklyExplorers]);

  return (
    <div className="leaderWrap">
      <div className="leaderHeader">
        <div>
          <h2 className="sectionTitle">Leaderboard</h2>
          <p className="muted" style={{ margin: 0 }}>
            Classifiche live: Spot · Esploratori · Settimana
          </p>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === "spots" ? "active" : ""}`} onClick={() => setTab("spots")} type="button">
            📍 Spot <span className="pill">{props.spots.length}</span>
          </button>
          <button className={`tab ${tab === "explorers" ? "active" : ""}`} onClick={() => setTab("explorers")} type="button">
            🧑‍🚀 Generali <span className="pill">{props.explorers.length}</span>
          </button>
          <button className={`tab ${tab === "weekly" ? "active" : ""}`} onClick={() => setTab("weekly")} type="button">
            📅 Settimana <span className="pill">{topWeekly.length}</span>
          </button>
        </div>
      </div>

      <div className="leaderGrid">
        {/* SPOTS */}
        <section className={`leaderCol ${tab !== "spots" ? "mobileHidden" : ""}`}>
          <div className="colTitle">📍 Spot</div>
          <div className="colList">
            {topSpots.map((v, i) => {
              const score = toInt(v.score);
              const lvl = spotLevel(score);
              const prevAt = prevAtForSpot(lvl.label);
              const pct = spotProgressPct(score, lvl, prevAt);
              const slugMatch = String(v.meta ?? "").match(/slug=([a-z0-9-]+)/i);
              const slug = slugMatch?.[1] ?? null;
              const avg = fmtRating(v.avg_rating);
              const cnt = toInt(v.ratings_count);

              return (
                <div className="rowCard" key={v.id}>
                  <div className="rowTop">
                    <div className="rankBox">{i + 1}</div>
                    <div className="rowMain">
                      <div className="rowName" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {v.name ?? "Spot"}
                        {v.hasActivePromo && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 7px",
                              borderRadius: 999,
                              background: "linear-gradient(135deg, #fb923c, #ef4444)",
                              color: "#fff",
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                              lineHeight: 1.6,
                            }}
                          >
                            🔥 Promo
                          </span>
                        )}
                      </div>
                      <div className="rowMeta">
                        {lvl.emoji} {lvl.label} • <b>{score}</b> pt
                        {avg != null && (
                          <span> • ⭐ <b>{avg}</b>{cnt > 0 && <span className="muted"> ({cnt})</span>}</span>
                        )}
                      </div>
                    </div>
                    <div className="rowRight">
                      {slug && <Link className="btn mini" href={`/v/${slug}`} target="_blank">Apri</Link>}
                    </div>
                  </div>
                  <div className="bar"><div className="barFill spot" style={{ width: `${pct}%` }} /></div>
                  <div className="barText">
                    Prossimo: {lvl.nextAt == null ? <b>MAX</b> : <b>{lvl.nextAt} pt</b>} • {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* EXPLORERS — classifica generale */}
        <section className={`leaderCol ${tab !== "explorers" ? "mobileHidden" : ""}`}>
          <div className="colTitle">🧑‍🚀 Esploratori (tutti i tempi)</div>
          <div className="colList">
            {topExplorers.map((u, i) => {
              const score = toInt(u.score);
              const lvlInfo = getExplorerLevel(score);
              const pct = Math.round(lvlInfo.progress);

              return (
                <div className="rowCard" key={u.id}>
                  <div className="rowTop">
                    <div className="rankBox">{i + 1}</div>
                    <div className="rowMain">
                      <div className="rowName">{u.name ?? "Esploratore"}</div>
                      <div className="rowMeta">
                        {lvlInfo.current.emoji} {lvlInfo.current.name} • <b>{score}</b> pt
                      </div>
                    </div>
                    <div className="rowRight">
                      <Link className="btn mini" href="/me">Profilo</Link>
                    </div>
                  </div>
                  <div className="bar"><div className="barFill user" style={{ width: `${pct}%` }} /></div>
                  <div className="barText">
                    Prossimo: {lvlInfo.next == null ? <b>MAX</b> : <b>{lvlInfo.next.min} pt</b>} • {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* WEEKLY — classifica settimanale */}
        <section className={`leaderCol ${tab !== "weekly" ? "mobileHidden" : ""}`}>
          <div className="colTitle">📅 Esploratori della settimana</div>
          <p className="muted" style={{ fontSize: 12, margin: "0 0 10px", padding: "0 2px" }}>
            Si azzera ogni lunedì a mezzanotte.
          </p>
          {topWeekly.length === 0 ? (
            <div className="notice" style={{ fontSize: 13 }}>
              Nessuna attività questa settimana ancora.
            </div>
          ) : (
            <div className="colList">
              {topWeekly.map((u, i) => (
                <div className="rowCard" key={u.user_id}>
                  <div className="rowTop">
                    <div className="rankBox">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                    <div className="rowMain">
                      <div className="rowName">{u.user_name ?? "Esploratore"}</div>
                      <div className="rowMeta"><b>{u.points_week}</b> pt questa settimana</div>
                    </div>
                  </div>
                  <div className="bar">
                    <div
                      className="barFill user"
                      style={{
                        width: `${topWeekly[0]?.points_week > 0 ? Math.round((u.points_week / topWeekly[0].points_week) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
