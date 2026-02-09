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

        <Link className="btn" href="/" style={{ marginTop: 16 }}>
          ← Leaderboard
        </Link>
      </div>
    );
  }

  const v = venue as Venue;

  return (
    <div className="card">
      <h1 className="h1">{v.name}</h1>

      <p className="muted" style={{ marginTop: 6 }}>
        {v.city ?? "—"} • slug: <b>{v.slug}</b>
      </p>

      {/* ✅ NUOVA LOGICA (scan → upload → voto) */}
      <div style={{ marginTop: 18 }}>
        <VisitFlow venueId={v.id} slug={v.slug!} />
      </div>

      {/* ⭐ Voto (facoltativo) */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <RateSpotButton venueId={v.id} spotName={v.name} className="btn" />
      </div>

      <Link className="btn" href="/" style={{ marginTop: 16 }}>
        ← Leaderboard
      </Link>
    </div>
  );
}