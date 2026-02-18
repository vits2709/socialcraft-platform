import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import SpotEditForm from "@/components/SpotEditForm";

export const runtime = "nodejs";

type VenueFull = {
  id: string;
  name: string;
  slug: string | null;
  indirizzo: string | null;
  telefono: string | null;
  sito_web: string | null;
  categoria: string | null;
  fascia_prezzo: number | null;
  servizi: string[] | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  orari: Record<string, { apertura: string; chiusura: string; chiuso: boolean }> | null;
  foto: string[] | null;
  lat: number | null;
  lng: number | null;
};

export default async function SpotEditPage(props: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await props.params;

  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/admin");

  const supabase = await createSupabaseServerClientReadOnly();

  const { data: venue, error } = await supabase
    .from("venues")
    .select(
      "id,name,slug,indirizzo,telefono,sito_web,categoria,fascia_prezzo,servizi,is_active,is_featured,orari,foto,lat,lng"
    )
    .eq("id", venueId)
    .maybeSingle();

  if (error || !venue) {
    return (
      <div className="card">
        <h1 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 900 }}>Modifica spot</h1>
        <div className="notice">Venue non trovata.</div>
        <Link className="btn" href="/admin" style={{ marginTop: 12 }}>
          ← Admin
        </Link>
      </div>
    );
  }

  const v = venue as VenueFull;

  return (
    <div className="card">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 900 }}>
            Modifica info spot
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            <b>{v.name}</b> {v.slug ? `• slug: ${v.slug}` : ""} • ID: {v.id}
          </p>
          {v.lat != null && v.lng != null && (
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
              📍 Geocodificato: {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn" href={`/admin/venues/${venueId}`}>
            ← Gestisci
          </Link>
          {v.slug && (
            <Link className="btn" href={`/v/${v.slug}`} target="_blank">
              Apri pagina
            </Link>
          )}
        </div>
      </div>

      <SpotEditForm venue={v} />
    </div>
  );
}
