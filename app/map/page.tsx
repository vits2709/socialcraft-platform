import Link from "next/link";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import FullMapLoader from "@/components/FullMapLoader";

export const runtime = "nodejs";
export const metadata = { title: "Mappa Spot — SocialCraft" };

type SpotRaw = {
  id: string;
  name: string;
  slug: string | null;
  lat: number;
  lng: number;
  categoria: string | null;
  fascia_prezzo: number | null;
  is_featured: boolean;
  city: string | null;
  indirizzo: string | null;
  avg_rating?: number | null;
};

export default async function MapPage() {
  const supabase = await createSupabaseServerClientReadOnly();

  const { data: venues } = await supabase
    .from("venues")
    .select("id,name,slug,lat,lng,categoria,fascia_prezzo,is_featured,city,indirizzo")
    .eq("is_active", true)
    .not("lat", "is", null)
    .not("lng", "is", null);

  // Rating enrichment — prova v_spot_ratings, fallback silenzioso
  const ids = (venues ?? []).map((v) => v.id);
  const ratingMap: Record<string, number> = {};
  if (ids.length > 0) {
    try {
      const { data: ratings } = await supabase
        .from("v_spot_ratings")
        .select("venue_id,avg_rating")
        .in("venue_id", ids);
      for (const r of ratings ?? []) {
        ratingMap[r.venue_id] = r.avg_rating;
      }
    } catch {}
  }

  const spots: SpotRaw[] = (venues ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    lat: v.lat as number,
    lng: v.lng as number,
    categoria: v.categoria ?? null,
    fascia_prezzo: v.fascia_prezzo ?? null,
    is_featured: v.is_featured ?? false,
    city: v.city ?? null,
    indirizzo: v.indirizzo ?? null,
    avg_rating: ratingMap[v.id] ?? null,
  }));

  const hasSpots = spots.length > 0;

  return (
    <>
      {/* Stile per la pagina mappa: vogliamo la massima altezza disponibile */}
      <style>{`
        /* Su /map togliamo padding al container e footer per massimizzare la mappa */
        @media (max-width: 640px) {
          .map-page-wrap { margin: 0 -12px; }
          .map-page-map  { border-radius: 0 !important; border-left: none !important; border-right: none !important; }
        }
      `}</style>

      <div className="map-page-wrap" style={{ display: "grid", gap: 10 }}>
        {/* Header compatto */}
        <div
          className="card"
          style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>🗺 Mappa Spot</h1>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
              {hasSpots ? `${spots.length} spot con posizione` : "Nessuno spot geolocalizzato"}
            </p>
          </div>
          <Link className="btn" href="/">← Home</Link>
        </div>

        {/* Mappa — altezza che massimizza lo schermo disponibile */}
        <div
          className="map-page-map"
          style={{
            height: "calc(100dvh - 145px)",
            minHeight: 420,
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
          }}
        >
          {!hasSpots ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.7)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🗺</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Nessuno spot geolocalizzato</div>
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                  Gli spot appariranno qui quando l&apos;admin inserisce l&apos;indirizzo.
                </p>
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <FullMapLoader spots={spots as any} />
          )}
        </div>
      </div>
    </>
  );
}
