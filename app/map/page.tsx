import Link from "next/link";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import FullMapLoader from "@/components/FullMapLoader";

export const runtime = "nodejs";
export const metadata = { title: "Mappa Spot — SocialCraft" };

// Must match the SpotPin type in FullMap (lat/lng are required numbers there)
type SpotRaw = {
  id: string;
  name: string;
  slug: string | null;
  lat: number | null;
  lng: number | null;
  categoria: string | null;
  fascia_prezzo: number | null;
  is_featured: boolean;
  city: string | null;
  avg_rating?: number | null;
};

export default async function MapPage() {
  const supabase = await createSupabaseServerClientReadOnly();

  const { data: venues } = await supabase
    .from("venues")
    .select("id,name,slug,lat,lng,categoria,fascia_prezzo,is_featured,city")
    .eq("is_active", true)
    .not("lat", "is", null)
    .not("lng", "is", null);

  // Try to enrich with avg_rating from spot_rating_summary
  const ids = (venues ?? []).map((v) => v.id);
  let ratingMap: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: ratings } = await supabase
      .from("spot_rating_summary")
      .select("venue_id,avg_rating")
      .in("venue_id", ids);
    for (const r of ratings ?? []) {
      ratingMap[r.venue_id] = r.avg_rating;
    }
  }

  const spots: SpotRaw[] = (venues ?? []).map((v) => ({
    ...v,
    avg_rating: ratingMap[v.id] ?? null,
  }));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Header */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>🗺 Mappa Spot</h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              {spots.length} spot{spots.length !== 1 ? " con posizione" : " con posizione"}
            </p>
          </div>
          <Link className="btn" href="/">← Home</Link>
        </div>
      </div>

      {/* Map */}
      <div
        style={{
          height: "calc(100vh - 160px)",
          minHeight: 400,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
        }}
      >
        {spots.length === 0 ? (
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
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗺</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Nessuno spot geolocalizzato</div>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                Gli spot appariranno qui una volta che l&apos;admin inserisce l&apos;indirizzo.
              </p>
            </div>
          </div>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <FullMapLoader spots={spots as any} />
        )}
      </div>
    </div>
  );
}
