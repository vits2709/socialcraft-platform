import Link from "next/link";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import VisitFlow from "@/components/VisitFlow";
import RateSpotButton from "@/components/RateSpotButton";

export const runtime = "nodejs";

type Venue = {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
};

type RatingSummary = {
  venue_id: string;
  avg_rating: number | null;
  ratings_count: number | null;
};

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`}>⭐</span>
      ))}
      {half ? <span>✳️</span> : null}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`}>☆</span>
      ))}
    </span>
  );
}

export default async function VenuePublicPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const supabase = await createSupabaseServerClientReadOnly();

  const { data: venue, error } = await supabase
    .from("venues")
    .select("id,name,city,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !venue) {
    return (
      <div className="card">
        <h1 className="h1">Spot</h1>
        <div className="notice">Errore: not_found</div>
        <div className="notice">Spot non trovato.</div>
        <Link className="btn" href="/">← Leaderboard</Link>
      </div>
    );
  }

  const v = venue as Venue;

  // ✅ rating summary (view)
  const { data: rs } = await supabase
    .from("spot_rating_summary")
    .select("venue_id,avg_rating,ratings_count")
    .eq("venue_id", v.id)
    .maybeSingle();

  const summary = (rs as RatingSummary | null) ?? null;
  const avg = Number(summary?.avg_rating ?? 0);
  const count = Number(summary?.ratings_count ?? 0);

  return (
    <div className="card">
      <h1 className="h1">{v.name}</h1>

      <p className="muted" style={{ marginTop: 6 }}>
        {v.city ?? "—"} • slug: <b>{v.slug}</b>
      </p>

      {/* ✅ BLOCCO VOTI */}
      <div className="notice" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>Valutazione Spot</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Media voti e numero votanti
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
              <Stars value={avg} />
              <span style={{ fontWeight: 900 }}>{count ? avg.toFixed(1) : "—"}</span>
            </div>
            <div className="muted">{count} voti</div>
          </div>
        </div>
      </div>

      {/* ✅ FLOW VISITA (scan → upload → rating) */}
      <div style={{ marginTop: 18 }}>
        <VisitFlow venueId={v.id} slug={v.slug!} />
      </div>

      <Link className="btn" href="/" style={{ marginTop: 16 }}>
        ← Leaderboard
      </Link>
    </div>
  );
}