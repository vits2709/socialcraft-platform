import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getVenueLeaderboard } from "@/lib/leaderboards";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { deleteVenueAction } from "@/app/admin/actions";
import DeleteVenueButton from "@/components/DeleteVenueButton";

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

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const venues = await getVenueLeaderboard(500);

  const supabase = await createSupabaseServerClientReadOnly();

  // ✅ prendiamo gli slug REALI dalla tabella venues (non dalla leaderboard)
  const venueIds = venues.map((v) => v.id);
  const { data: venueRows, error: venuesErr } = await supabase
    .from("venues")
    .select("id,slug")
    .in("id", venueIds);

  if (venuesErr) throw new Error(venuesErr.message);

  const slugMap = new Map<string, string | null>(
    (venueRows ?? []).map((r) => [String(r.id), (r as any).slug ?? null])
  );

  const extra = await Promise.all(
    venues.map(async (v) => {
      const [kpis, promoTitle] = await Promise.all([getKpis(v.id), getActivePromoTitle(v.id)]);
      return { venueId: v.id, kpis, promoTitle };
    })
  );

  const extraMap = new Map(extra.map((e) => [e.venueId, e]));

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Admin Dashboard
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Loggato come: <b>{user.email}</b>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className="btn" href="/admin/create-venue">
            + Nuova venue
          </Link>

          <span className="badge">
            <span className="dot" /> admin
          </span>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 12 }}>
        Qui gestisci le promo (una attiva per venue) e controlli scans/voti/visite.
      </div>

      <table className="table" aria-label="Admin venues overview">
        <thead>
          <tr>
            <th className="rank">#</th>
            <th>Venue</th>
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
            const ex = extraMap.get(v.id);
            const slug = slugMap.get(v.id) ?? null;

            return (
              <tr key={v.id}>
                <td className="rank">{i + 1}</td>

                <td>
                  <b>{v.name}</b>
                  <div className="muted">ID: {v.id}</div>
                  <div className="muted">slug: {slug ?? "—"}</div>
                </td>

                <td className="muted">{v.city ?? "—"}</td>

                <td className="score">
                  {Number(v.avg_rating).toFixed(2)}{" "}
                  <span className="muted">({v.ratings_count})</span>
                </td>

                <td className="score">{Number(v.visits_count ?? 0).toLocaleString("it-IT")}</td>

                <td className="score">{Number(ex?.kpis.scans_today ?? 0).toLocaleString("it-IT")}</td>

                <td className="score">{Number(ex?.kpis.votes_today ?? 0).toLocaleString("it-IT")}</td>

                <td className="score">{Number(ex?.kpis.scans_live_10m ?? 0).toLocaleString("it-IT")}</td>

                <td>{ex?.promoTitle ?? <span className="muted">—</span>}</td>

                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                    <Link className="btn" href={`/admin/venues/${v.id}`}>
                      Gestisci
                    </Link>

                    {slug ? (
                      <a className="btn" href={`/v/${slug}`} target="_blank" rel="noreferrer">
                        Apri
                      </a>
                    ) : (
                      <span className="muted">no slug</span>
                    )}

                    <form action={deleteVenueAction.bind(null, v.id)}>
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
          Nessuna venue trovata. Crea righe in <b>venues</b>.
        </div>
      ) : null}
    </div>
  );
}