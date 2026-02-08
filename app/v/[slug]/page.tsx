import Link from "next/link";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import ScanButton from "@/components/ScanButton";

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
        <h1 className="h1">Venue</h1>
        <div className="notice">Errore: not_found</div>
        <div className="notice">Venue non trovata.</div>
        <Link className="btn" href="/">← Leaderboard</Link>
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

      {/* Bottone scan */}
      <div style={{ marginTop: 20 }}>
        <ScanButton slug={v.slug!} />
      </div>

      <Link className="btn" href="/" style={{ marginTop: 16 }}>
        ← Leaderboard
      </Link>
    </div>
  );
}