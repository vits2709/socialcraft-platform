import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getVenueLeaderboard } from "@/lib/leaderboards";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Kpi = {
  scans_today: number;
  votes_today: number;
  scans_7d: number;
  votes_7d: number;
  scans_live_10m: number;
};

async function getActivePromoTitle(venueId: string) {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data } = await supabase.rpc("get_active_promo", { p_venue_id: venueId });
  const promo = Array.isArray(data) ? data[0] : null;
  return promo?.title ?? null;
}

async function getKpis(venueId: string): Promise<Kpi> {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data, error } = await supabase.rpc("get_venue_kpis", { p_venue_id: venueId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    scans_today:    Number(row?.scans_today ?? 0),
    votes_today:    Number(row?.votes_today ?? 0),
    scans_7d:       Number(row?.scans_7d ?? 0),
    votes_7d:       Number(row?.votes_7d ?? 0),
    scans_live_10m: Number(row?.scans_live_10m ?? 0),
  };
}

function fmt(n: number) {
  return Number(n ?? 0).toLocaleString("it-IT");
}

const KPI_COLORS = [
  { bg: "rgba(45,27,105,0.08)",  icon: "👣", border: "rgba(45,27,105,0.14)" },
  { bg: "rgba(123,192,67,0.10)", icon: "🗳️", border: "rgba(123,192,67,0.20)" },
  { bg: "rgba(59,130,246,0.08)", icon: "📍", border: "rgba(59,130,246,0.14)" },
  { bg: "rgba(251,146,60,0.10)", icon: "🎁", border: "rgba(251,146,60,0.18)" },
];

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const venues = await getVenueLeaderboard(500);
  const venueIds = venues.map((v) => String(v.id));

  const extra = await Promise.all(
    venues.map(async (v) => {
      const id = String(v.id);
      const [kpis, promoTitle] = await Promise.all([getKpis(id), getActivePromoTitle(id)]);
      return { venueId: id, kpis, promoTitle };
    })
  );
  const extraMap = new Map(extra.map((e) => [e.venueId, e]));

  const totals = extra.reduce(
    (acc, e) => {
      acc.scans_today += e.kpis.scans_today;
      acc.votes_today += e.kpis.votes_today;
      acc.promo_active += e.promoTitle ? 1 : 0;
      return acc;
    },
    { scans_today: 0, votes_today: 0, promo_active: 0 }
  );

  const topScan  = extra.sort((a, b) => b.kpis.scans_today - a.kpis.scans_today)[0];
  const topVote  = [...extra].sort((a, b) => b.kpis.votes_today - a.kpis.votes_today)[0];
  const topScanVenue = topScan  ? venues.find((v) => String(v.id) === topScan.venueId)  : null;
  const topVoteVenue = topVote  ? venues.find((v) => String(v.id) === topVote.venueId)  : null;

  const kpis = [
    { label: "Scan oggi",    value: fmt(totals.scans_today),   sub: "tutti gli Spot" },
    { label: "Voti oggi",    value: fmt(totals.votes_today),   sub: "tutti gli Spot" },
    { label: "Spot attivi",  value: fmt(venues.length),        sub: "in classifica" },
    { label: "Promo attive", value: fmt(totals.promo_active),  sub: "in questo momento" },
  ];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
            Centro di controllo
          </h1>
          <p style={{ margin: "4px 0 0", color: "rgba(15,23,42,0.55)", fontSize: 13 }}>
            Loggato come <b>{user.email}</b>
          </p>
        </div>
        <Link
          href="/admin/create-venue"
          className="btn primary"
          style={{ padding: "10px 18px", fontWeight: 700 }}
        >
          + Nuovo Spot
        </Link>
      </div>

      {/* KPI Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {kpis.map((k, i) => (
          <div
            key={k.label}
            style={{
              background: KPI_COLORS[i].bg,
              border: `1px solid ${KPI_COLORS[i].border}`,
              borderRadius: 14,
              padding: "20px 18px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>{KPI_COLORS[i].icon}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
              {k.value}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginTop: 4 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 12, color: "rgba(15,23,42,0.5)", marginTop: 2 }}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Top di oggi */}
      <div
        style={{
          background: "white",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: 14,
          padding: "20px 24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
          Top di oggi
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div
            style={{
              background: "rgba(45,27,105,0.05)",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid rgba(45,27,105,0.10)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(15,23,42,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              🔥 Top scan oggi
            </div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#2D1B69" }}>
              {topScanVenue?.name ?? "—"}
            </div>
            {topScanVenue && (
              <div style={{ fontSize: 13, color: "rgba(15,23,42,0.5)", marginTop: 2 }}>
                {fmt(topScan?.kpis.scans_today ?? 0)} scan
              </div>
            )}
          </div>
          <div
            style={{
              background: "rgba(123,192,67,0.07)",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid rgba(123,192,67,0.18)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(15,23,42,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              ⭐ Top voti oggi
            </div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#559a2e" }}>
              {topVoteVenue?.name ?? "—"}
            </div>
            {topVoteVenue && (
              <div style={{ fontSize: 13, color: "rgba(15,23,42,0.5)", marginTop: 2 }}>
                {fmt(topVote?.kpis.votes_today ?? 0)} voti
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link rapidi sezioni */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { href: "/admin/spots",         label: "Gestisci Spot",      icon: "📍" },
          { href: "/admin/users",         label: "Utenti",             icon: "👥" },
          { href: "/admin/receipts",      label: "Scontrini",          icon: "🧾" },
          { href: "/admin/missions",      label: "Missioni",           icon: "🎯" },
          { href: "/admin/prizes",        label: "Premi",              icon: "🏆" },
          { href: "/admin/notifications", label: "Notifiche",          icon: "📢" },
        ].map((s) => (
          <Link
            key={s.href}
            href={s.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "white",
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: 12,
              padding: "14px 16px",
              fontWeight: 700,
              fontSize: 14,
              color: "#0f172a",
              textDecoration: "none",
              boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              transition: "box-shadow 150ms, transform 150ms",
            }}
          >
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
