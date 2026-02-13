import Link from "next/link";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import HomeLeaderboards from "@/components/HomeLeaderboards";
import HomeScannerCTA from "@/components/HomeScannerCTA";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type LBRow = {
  id: string;
  name: string | null;
  score: number | null;
  meta?: string | null;
  avg_rating?: number | null;
  ratings_count?: number | null;
};

type SpotRatingRow = {
  venue_id: string;
  avg_rating: number | null;
  ratings_count: number | null;
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClientReadOnly();

  // 🔥 SPOT leaderboard invariata
  const { data: spotsRaw, error: sErr } = await supabase
    .from("leaderboard_venues")
    .select("id,name,score,meta")
    .order("score", { ascending: false })
    .limit(200);

  // 🔥 ESPLORATORI dai punti REALI
  const { data: explorersRaw, error: eErr } = await supabase
    .from("sc_users")
    .select("id,name,points")
    .order("points", { ascending: false })
    .limit(200);

  // adattiamo formato
  const explorers =
    explorersRaw?.map((u) => ({
      id: u.id,
      name: u.name ?? "Guest",
      score: u.points ?? 0,
      meta: null,
    })) ?? [];

  // -------- rating spot ----------
  let spots: LBRow[] = (spotsRaw ?? []) as LBRow[];

  try {
    const ids = spots.map((s) => s.id).filter(Boolean);

    if (ids.length > 0) {
      const { data: ratings } = await supabase
        .from("v_spot_ratings")
        .select("venue_id,avg_rating,ratings_count")
        .in("venue_id", ids);

      if (ratings) {
        const map = new Map<string, SpotRatingRow>();
        ratings.forEach((r) => map.set(r.venue_id, r));

        spots = spots.map((s) => {
          const r = map.get(s.id);
          return {
            ...s,
            avg_rating: r?.avg_rating ?? null,
            ratings_count: r?.ratings_count ?? null,
          };
        });
      }
    }
  } catch {}

  return (
    <div className="page">
      <div className="hero card">
        <div className="heroTop">
          <div>
            <h1 className="heroTitle">SocialCraft</h1>
            <p className="heroSubtitle">
              Scala la classifica degli <b>Esploratori</b> e fai salire gli <b>Spot</b>.
            </p>
          </div>

          <div className="heroCtas">
            <HomeScannerCTA />
            <Link className="btn primary" href="/me">
              Il mio profilo
            </Link>
            <Link className="btn" href="/login">
              Accedi
            </Link>
          </div>
        </div>

        {(sErr || eErr) && (
          <div className="notice" style={{ marginTop: 10 }}>
            {sErr ? <div>Errore Spot: {sErr.message}</div> : null}
            {eErr ? <div>Errore Esploratori: {eErr.message}</div> : null}
          </div>
        )}
      </div>

      <HomeLeaderboards spots={spots} explorers={explorers as LBRow[]} />

      <div className="card soft" style={{ marginTop: 14 }}>
        <div className="softRow">
          <div>
            <div className="softTitle">Sei uno Spot?</div>
            <div className="softText">
              Accedi come Spot e gestisci promo, stats e QR dalla dashboard.
            </div>
          </div>
          <Link className="btn" href="/venue">
            Dashboard Spot →
          </Link>
        </div>
      </div>
    </div>
  );
}