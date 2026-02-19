import Link from "next/link";
import { cookies } from "next/headers";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import HomeLeaderboards from "@/components/HomeLeaderboards";
import HomeScannerCTA from "@/components/HomeScannerCTA";
import HomeMapLoader from "@/components/HomeMapLoader";
import type { HomeSpotPin } from "@/components/HomeMap";
import type { WeeklyRow } from "@/components/HomeLeaderboards";

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

  // Controlla se l'utente è loggato (explorer via cookie sc_uid, o admin/spot via Supabase Auth)
  const cookieStore = await cookies();
  const scUid = cookieStore.get("sc_uid")?.value?.trim() ?? null;
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const isLoggedIn = !!scUid || !!authUser;

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

  // 🔥 CLASSIFICA SETTIMANALE
  let weeklyExplorers: WeeklyRow[] = [];
  try {
    const { data: weeklyRaw } = await supabase
      .from("v_weekly_leaderboard")
      .select("user_id,user_name,points_week,rank");
    weeklyExplorers = (weeklyRaw ?? []) as WeeklyRow[];
  } catch {
    // Se la view non esiste ancora (migration non eseguita), ignora silenziosamente
  }

  // adattiamo formato
  const explorers =
    explorersRaw?.map((u) => ({
      id: u.id,
      name: u.name ?? "Guest",
      score: u.points ?? 0,
      meta: null,
    })) ?? [];

  // -------- spot per la mappa (lat/lng non null) ----------
  let mapSpots: HomeSpotPin[] = [];
  try {
    const { data: mapRaw } = await supabase
      .from("venues")
      .select("id,name,slug,lat,lng,categoria,fascia_prezzo,is_featured")
      .eq("is_active", true)
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (mapRaw && mapRaw.length > 0) {
      // Enrichment rating
      const mapIds = mapRaw.map((v) => v.id);
      const { data: mapRatings } = await supabase
        .from("v_spot_ratings")
        .select("venue_id,avg_rating")
        .in("venue_id", mapIds);

      const ratingMap = new Map<string, number>();
      (mapRatings ?? []).forEach((r) => ratingMap.set(r.venue_id, r.avg_rating));

      mapSpots = mapRaw.map((v) => ({
        id: v.id,
        name: v.name,
        slug: v.slug,
        lat: v.lat as number,
        lng: v.lng as number,
        categoria: v.categoria ?? null,
        fascia_prezzo: v.fascia_prezzo ?? null,
        is_featured: v.is_featured ?? false,
        avg_rating: ratingMap.get(v.id) ?? null,
      }));
    }
  } catch {}

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
            {!isLoggedIn && (
              <Link className="btn" href="/login">
                Accedi
              </Link>
            )}
          </div>
        </div>

        <div className="howGrid" style={{ marginTop: 14 }}>
          <div className="howCard">
            <div className="howIcon">📷</div>
            <div>
              <div className="howTitle">Scansiona il QR</div>
              <div className="howText">Inquadra il codice dello Spot e guadagna punti presenza ogni giorno.</div>
            </div>
          </div>
          <div className="howCard">
            <div className="howIcon">⭐</div>
            <div>
              <div className="howTitle">Vota gli Spot</div>
              <div className="howText">Lascia una recensione dopo la visita e contribuisci alla classifica.</div>
            </div>
          </div>
          <div className="howCard">
            <div className="howIcon">🏆</div>
            <div>
              <div className="howTitle">Scala la classifica</div>
              <div className="howText">Accumula punti, sblocca badge e diventa Leggenda Locale.</div>
            </div>
          </div>
        </div>

        {(sErr || eErr) && (
          <div className="notice" style={{ marginTop: 10 }}>
            {sErr ? <div>Errore Spot: {sErr.message}</div> : null}
            {eErr ? <div>Errore Esploratori: {eErr.message}</div> : null}
          </div>
        )}
      </div>

      <HomeLeaderboards spots={spots} explorers={explorers as LBRow[]} weeklyExplorers={weeklyExplorers} />

      {/* ---- SEZIONE MAPPA ---- */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            borderBottom: "1px solid rgba(15,23,42,0.07)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: -0.2 }}>
              🗺 Esplora gli Spot
            </h2>
            {mapSpots.length > 0 && (
              <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                {mapSpots.length} spot sulla mappa
              </p>
            )}
          </div>
          <Link className="btn" href="/map">
            Vedi tutti →
          </Link>
        </div>

        {/* Mappa */}
        {mapSpots.length === 0 ? (
          <div
            style={{
              height: 240,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.5)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Nessuno spot geolocalizzato ancora.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: 340 }}>
            <HomeMapLoader spots={mapSpots} />
          </div>
        )}

        {/* Footer */}
        {mapSpots.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid rgba(15,23,42,0.07)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Link
              className="btn primary"
              href="/map"
              style={{ fontSize: 13 }}
            >
              Vedi tutti gli spot →
            </Link>
          </div>
        )}
      </div>

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