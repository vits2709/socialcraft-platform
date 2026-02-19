import { cookies } from "next/headers";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import CheckinClient from "./CheckinClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Venue = {
  id: string;
  name: string;
  city: string | null;
  slug: string;
  indirizzo: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean | null;
};

export default async function CheckinPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  // Verifica autenticazione (sistema sc_uid)
  const cookieStore = await cookies();
  const scUid = cookieStore.get("sc_uid")?.value?.trim() ?? null;

  if (!scUid) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
        <h1 style={{ margin: "0 0 8px", fontWeight: 900 }}>Accedi per fare check-in</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Devi essere loggato per registrare la tua presenza e guadagnare punti.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn primary" href={`/login?redirect=/checkin/${slug}`}>
            Accedi
          </Link>
          <Link className="btn" href={`/signup?redirect=/checkin/${slug}`}>
            Registrati
          </Link>
        </div>
      </div>
    );
  }

  // Carica lo spot
  const supabase = createSupabaseAdminClient();
  const { data: venue, error } = await supabase
    .from("venues")
    .select("id,name,city,slug,indirizzo,lat,lng,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !venue) {
    return (
      <div className="card">
        <h1 className="h1">Check-in</h1>
        <div className="notice">Spot non trovato. Controlla il QR code.</div>
        <Link className="btn" href="/" style={{ marginTop: 12, display: "inline-block" }}>
          ← Home
        </Link>
      </div>
    );
  }

  const v = venue as Venue;

  if (v.is_active === false) {
    return (
      <div className="card">
        <h1 className="h1">Check-in — {v.name}</h1>
        <div
          className="notice"
          style={{
            borderColor: "rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.06)",
            color: "#dc2626",
          }}
        >
          ⚠️ Questo spot non è più attivo. Il check-in non è disponibile.
        </div>
        <Link className="btn" href="/" style={{ marginTop: 12, display: "inline-block" }}>
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📍</div>
        <h1 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 26 }}>{v.name}</h1>
        {v.city && <p className="muted" style={{ margin: 0 }}>{v.city}</p>}
        {v.indirizzo && (
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            {v.indirizzo}
          </p>
        )}
      </div>

      <CheckinClient
        slug={v.slug}
        venueName={v.name}
        spotLat={v.lat}
        spotLng={v.lng}
      />

      <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <Link className="btn" href={`/v/${v.slug}`}>
          Pagina spot
        </Link>
        <Link className="btn" href="/">
          ← Home
        </Link>
      </div>
    </div>
  );
}
