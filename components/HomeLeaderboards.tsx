"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LBRow } from "@/app/page";

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
  // 1 decimale (4.2)
  return Math.round(n * 10) / 10;
}

type Level = {
  label: string;
  emoji: string;
  nextAt: number | null;
};

function explorerLevel(points: number): Level {
  if (points < 10) return { label: "Curioso", emoji: "👀", nextAt: 10 };
  if (points < 50) return { label: "Girellone", emoji: "🚶‍♂️", nextAt: 50 };
  if (points < 150) return { label: "Esploratore", emoji: "🧭", nextAt: 150 };
  if (points < 400) return { label: "Frequentatore", emoji: "🍹", nextAt: 400 };
  return { label: "Leggenda Locale", emoji: "🏆", nextAt: null };
}

function spotLevel(points: number): Level {
  if (points < 20) return { label: "Nuovo", emoji: "🌱", nextAt: 20 };
  if (points < 60) return { label: "In Crescita", emoji: "📈", nextAt: 60 };
  if (points < 150) return { label: "Hot", emoji: "🔥", nextAt: 150 };
  if (points < 350) return { label: "Iconico", emoji: "✨", nextAt: 350 };
  return { label: "Leggenda", emoji: "👑", nextAt: null };
}

function prevAtForExplorer(label: string) {
  if (label === "Curioso") return 0;
  if (label === "Girellone") return 10;
  if (label === "Esploratore") return 50;
  if (label === "Frequentatore") return 150;
  return 400;
}
function prevAtForSpot(label: string) {
  if (label === "Nuovo") return 0;
  if (label === "In Crescita") return 20;
  if (label === "Hot") return 60;
  if (label === "Iconico") return 150;
  return 350;
}

function progressPct(points: number, lvl: Level, prevAt: number) {
  if (lvl.nextAt == null) return 100;
  const span = Math.max(1, lvl.nextAt - prevAt);
  const cur = Math.min(span, Math.max(0, points - prevAt));
  return Math.round((cur / span) * 100);
}

export default function HomeLeaderboards(props: { spots: LBRow[]; explorers: LBRow[] }) {
  const [tab, setTab] = useState<"spots" | "explorers">("spots");

  const topSpots = useMemo(() => props.spots.slice(0, 20), [props.spots]);
  const topExplorers = useMemo(() => props.explorers.slice(0, 20), [props.explorers]);

  return (
    <div className="leaderWrap">
      <div className="leaderHeader">
        <div>
          <h2 className="sectionTitle">Leaderboard</h2>
          <p className="muted" style={{ margin: 0 }}>
            Top 20 live: Spot + Esploratori
          </p>
        </div>

        <div className="tabs">
          <button
            className={`tab ${tab === "spots" ? "active" : ""}`}
            onClick={() => setTab("spots")}
            type="button"
          >
            📍 Spot <span className="pill">{props.spots.length}</span>
          </button>
          <button
            className={`tab ${tab === "explorers" ? "active" : ""}`}
            onClick={() => setTab("explorers")}
            type="button"
          >
            🧑‍🚀 Esploratori <span className="pill">{props.explorers.length}</span>
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
              const pct = progressPct(score, lvl, prevAt);

              const slugMatch = String(v.meta ?? "").match(/slug=([a-z0-9-]+)/i);
              const slug = slugMatch?.[1] ?? null;

              // ✅ Rating
              const avg = fmtRating(v.avg_rating);
              const cnt = toInt(v.ratings_count);

              return (
                <div className="rowCard" key={v.id}>
                  <div className="rowTop">
                    <div className="rankBox">{i + 1}</div>

                    <div className="rowMain">
                      <div className="rowName">{v.name ?? "Spot"}</div>
                      <div className="rowMeta">
                        {lvl.emoji} {lvl.label} • <b>{score}</b> pt
                        {/* ✅ rating in meta (senza rivelare chi ha votato) */}
                        {avg != null ? (
                          <span>
                            {" "}
                            • ⭐ <b>{avg}</b>
                            {cnt > 0 ? <span className="muted"> ({cnt})</span> : null}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="rowRight">
                      {slug ? (
                        <Link className="btn mini" href={`/v/${slug}`} target="_blank">
                          Apri
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </div>
                  </div>

                  <div className="bar">
                    <div className="barFill spot" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="barText">
                    Prossimo: {lvl.nextAt == null ? <b>MAX</b> : <b>{lvl.nextAt} pt</b>} • {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* EXPLORERS */}
        <section className={`leaderCol ${tab !== "explorers" ? "mobileHidden" : ""}`}>
          <div className="colTitle">🧑‍🚀 Esploratori</div>
          <div className="colList">
            {topExplorers.map((u, i) => {
              const score = toInt(u.score);
              const lvl = explorerLevel(score);
              const prevAt = prevAtForExplorer(lvl.label);
              const pct = progressPct(score, lvl, prevAt);

              return (
                <div className="rowCard" key={u.id}>
                  <div className="rowTop">
                    <div className="rankBox">{i + 1}</div>
                    <div className="rowMain">
                      <div className="rowName">{u.name ?? "Esploratore"}</div>
                      <div className="rowMeta">
                        {lvl.emoji} {lvl.label} • <b>{score}</b> pt
                      </div>
                    </div>

                    <div className="rowRight">
                      <Link className="btn mini" href={`/u/${encodeURIComponent(u.id)}`} target="_blank">
                        Profilo
                      </Link>
                    </div>
                  </div>

                  <div className="bar">
                    <div className="barFill user" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="barText">
                    Prossimo: {lvl.nextAt == null ? <b>MAX</b> : <b>{lvl.nextAt} pt</b>} • {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}