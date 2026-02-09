import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getVenueLeaderboard } from "@/lib/leaderboards";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { deleteVenueAction } from "@/app/admin/actions";
import DeleteVenueButton from "@/components/DeleteVenueButton";

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
  const { data, error } = await supabase.rpc("get_active_promo", { p_venue_id: venueId });
  if (error) return null;
  const promo = Array.isArray(data) ? data[0] : null;
  return promo?.title ?? null;
}

async function getKpis(venueId: string): Promise<Kpi> {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data, error } = await supabase.rpc("get_venue_kpis", { p_venue_id: venueId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    scans_today: Number(row?.scans_today ?? 0),
    votes_today: Number(row?.votes_today ?? 0),
    scans_7d: Number(row?.scans_7d ?? 0),
    votes_7d: Number(row?.votes_7d ?? 0),
    scans_live_10m: Number(row?.scans_live_10m ?? 0),
  };
}

type SlugRow = { id: string; slug: string | null };

async function getSlugsByVenueIds(ids: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (!ids.length) return map;

  const supabase = await createSupabaseServerClientReadOnly();
  const { data, error } = await supabase
    .from("venues")
    .select("id,slug")
    .in("id", ids);

  if (error || !data) return map;
  (data as SlugRow[]).forEach((r) => map.set(String(r.id), r.slug ?? null));
  return map;
}

function fmt(n: number) {
  return Number(n ?? 0).toLocaleString("it-IT");
}

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const venues = await getVenueLeaderboard(500);
  const venueIds = venues.map((v) => String(v.id));
  const slugsMap = await getSlugsByVenueIds(venueIds);

  const extra = await Promise.all(
    venues.map(async (v) => {
      const [kpis, promoTitle] = await Promise.all([getKpis(String(v.id)), getActivePromoTitle(String(v.id))]);
      return { venueId: String(v.id), kpis, promoTitle };
    })
  );
  const extraMap = new Map(extra.map((e) => [e.venueId, e]));

  // KPI globali (senza query extra)
  const totals = extra.reduce(
    (acc, e) => {
      acc.scans_today += e.kpis.scans_today;
      acc.votes_today += e.kpis.votes_today;
      acc.promo_active += e.promoTitle ? 1 : 0;
      return acc;
    },
    { scans_today: 0, votes_today: 0, promo_active: 0 }
  );

  // Top del giorno
  const topScan = extra
    .map((e) => ({ venueId: e.venueId, value: e.kpis.scans_today }))
    .sort((a, b) => b.value - a.value)[0];

  const topVote = extra
    .map((e) => ({ venueId: e.venueId, value: e.kpis.votes_today }))
    .sort((a, b) => b.value - a.value)[0];

  const topScanVenue = topScan ? venues.find((v) => String(v.id) === topScan.venueId) : null;
  const topVoteVenue = topVote ? venues.find((v) => String(v.id) === topVote.venueId) : null;

  return (
    <div className="card">
      {/* HEADER */}
      <div className="cardHead" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 240 }}>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Centro di controllo
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Loggato come: <b>{user.email}</b>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          <Link className="btn" href="/admin/create-venue">
            + Nuovo Spot
          </Link>
         <Link className="btn" href="/admin/receipts">
          Scontrini
         </Link>

          <Link className="btn" href="/admin/users">
            Esploratori
          </Link>

          <span className="badge">
            <span className="dot" /> admin
          </span>
        </div>
      </div>

      {/* INTRO */}
      <div className="notice" style={{ marginBottom: 12 }}>
        Qui gestisci Spot, promo e controlli scans/voti/visite in tempo reale (light).
      </div>

      {/* KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div className="card" style={{ padding: 12 }}>
          <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>👣 Scan oggi</span>
            <span className="badge">totale</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{fmt(totals.scans_today)}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Somma scans di tutti gli Spot
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>🗳️ Voti oggi</span>
            <span className="badge">totale</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{fmt(totals.votes_today)}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Somma voti di tutti gli Spot
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>📍 Spot</span>
            <span className="badge">attivi</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{fmt(venues.length)}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Quanti Spot sono in classifica
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>🎁 Promo</span>
            <span className="badge">attive</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{fmt(totals.promo_active)}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Spot con promo attiva adesso
          </div>
        </div>
      </div>

      {/* TOP DEL GIORNO */}
      <div
        className="card"
        style={{
          padding: 12,
          marginBottom: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        <div>
          <div className="muted">🔥 Top scan oggi</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>
            {topScanVenue ? topScanVenue.name : "—"}{" "}
            {topScanVenue ? <span className="muted">• {fmt(topScan?.value ?? 0)} scan</span> : null}
          </div>
        </div>

        <div>
          <div className="muted">⭐ Top voti oggi</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>
            {topVoteVenue ? topVoteVenue.name : "—"}{" "}
            {topVoteVenue ? <span className="muted">• {fmt(topVote?.value ?? 0)} voti</span> : null}
          </div>
        </div>
      </div>

      {/* TABELLA */}
      <table className="table" aria-label="Admin spots overview">
        <thead>
          <tr>
            <th className="rank">#</th>
            <th>Spot</th>
            <th>Città</th>
            <th className="score">Rating</th>
            <th className="score">Visite</th>
            <th className="score">Scan oggi</th>
            <th className="score">Voti oggi</th>
            <th className="score">Live 10m</th>
            <th>Promo attiva</th>
            <th style={{ textAlign: "right" }}>Azioni</th>
          </tr>
        </thead>

        <tbody>
          {venues.map((v, i) => {
            const id = String(v.id);
            const ex = extraMap.get(id);
            const slug = slugsMap.get(id) ?? null;

            return (
              <tr key={id}>
                <td className="rank">{i + 1}</td>

                <td>
                  <b>{v.name}</b>
                  <div className="muted">ID: {id}</div>
                  {slug ? <div className="muted">slug: {slug}</div> : null}
                </td>

                <td className="muted">{v.city ?? "—"}</td>

                <td className="score">
                  {Number(v.avg_rating ?? 0).toFixed(2)} <span className="muted">({v.ratings_count ?? 0})</span>
                </td>

                <td className="score">{fmt(Number(v.visits_count ?? 0))}</td>

                <td className="score">{fmt(Number(ex?.kpis.scans_today ?? 0))}</td>

                <td className="score">{fmt(Number(ex?.kpis.votes_today ?? 0))}</td>

                <td className="score">{fmt(Number(ex?.kpis.scans_live_10m ?? 0))}</td>

                <td>
                  {ex?.promoTitle ? (
                    <span className="badge">🎁 {ex.promoTitle}</span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>

                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                    <Link className="btn" href={`/admin/venues/${id}`}>
                      Gestisci
                    </Link>

                    {slug ? (
                      <a className="btn" href={`/v/${slug}`} target="_blank" rel="noreferrer">
                        Apri
                      </a>
                    ) : (
                      <span className="muted" style={{ padding: "0 6px" }}>
                        no slug
                      </span>
                    )}

                    <form action={deleteVenueAction.bind(null, id)}>
                      <DeleteVenueButton venueName={v.name} />
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {venues.length === 0 ? (
        <div className="notice" style={{ marginTop: 12 }}>
          Nessuno Spot trovato. Crea righe in <b>venues</b>.
        </div>
      ) : null}
    </div>
  );
}