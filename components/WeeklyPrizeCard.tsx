"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type WeeklyEntry = {
  user_id: string;
  user_name: string | null;
  points_week: number;
  rank: number;
};

type PrizeData = {
  id: string;
  week_start: string;
  prize_description: string;
  prize_image: string | null;
  spot_id: string | null;
  venues: { name: string; slug: string | null } | null;
};

export default function WeeklyPrizeCard({
  prize,
  topThree,
}: {
  prize: PrizeData;
  topThree: WeeklyEntry[];
}) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    function computeCountdown() {
      // Fine settimana: domenica 23:59:59 (Europe/Rome)
      // week_start = lunedì → fine = lunedì + 7 giorni
      const weekStart = new Date(prize.week_start + "T00:00:00");
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);
      const now = new Date();
      const diff = weekEnd.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Settimana conclusa");
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);

      if (days > 0) setCountdown(`${days}g ${hours}h`);
      else if (hours > 0) setCountdown(`${hours}h ${mins}m`);
      else setCountdown(`${mins}m`);
    }

    computeCountdown();
    const iv = setInterval(computeCountdown, 60000);
    return () => clearInterval(iv);
  }, [prize.week_start]);

  const venue = prize.venues;

  return (
    <div
      className="card"
      style={{
        background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
        border: "1.5px solid rgba(245,158,11,0.3)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            🏆 Premio settimana
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: -0.3 }}>
            {prize.prize_description}
          </h2>
          {venue && (
            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.7 }}>
              Offerto da{" "}
              {venue.slug ? (
                <Link href={`/venue/${venue.slug}`} style={{ fontWeight: 800, color: "inherit" }}>
                  {venue.name}
                </Link>
              ) : (
                <b>{venue.name}</b>
              )}
            </div>
          )}
        </div>

        {/* Countdown */}
        <div
          style={{
            textAlign: "right",
            background: "rgba(245,158,11,0.12)",
            borderRadius: 12,
            padding: "8px 12px",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 700 }}>Tempo rimasto</div>
          <div style={{ fontSize: 18, fontWeight: 950, color: "#b45309" }}>{countdown}</div>
        </div>
      </div>

      {/* Top 3 */}
      {topThree.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
            Classifica corrente
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {topThree.slice(0, 3).map((e, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div
                  key={e.user_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: i === 0 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.6)",
                    fontWeight: i === 0 ? 900 : 700,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{medals[i]}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.user_name ?? "Esploratore"}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 13,
                      fontWeight: 900,
                      background: "rgba(0,0,0,0.06)",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {e.points_week} pt
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="btn primary" href="/me" style={{ fontSize: 13 }}>
          Il mio profilo →
        </Link>
        <Link className="btn" href="/feed" style={{ fontSize: 13 }}>
          Feed
        </Link>
      </div>
    </div>
  );
}
