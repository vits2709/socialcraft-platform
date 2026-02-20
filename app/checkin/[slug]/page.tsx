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
  categoria: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean | null;
};

function todayRange() {
  const day = new Date().toISOString().slice(0, 10);
  return {
    start: `${day}T00:00:00.000Z`,
    end: `${day}T23:59:59.999Z`,
  };
}

export default async function CheckinPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  // ── Auth: richiede sc_uid
  const cookieStore = await cookies();
  const scUid = cookieStore.get("sc_uid")?.value?.trim() ?? null;

  if (!scUid) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔐</div>
        <h1 style={{ margin: "0 0 10px", fontWeight: 900, fontSize: 24 }}>
          Accedi per fare check-in
        </h1>
        <p className="muted" style={{ marginBottom: 28, fontSize: 15 }}>
          Devi essere loggato per registrare la presenza e guadagnare punti.
        </p>
        <div style={{ display: "grid", gap: 10, maxWidth: 260, margin: "0 auto" }}>
          <Link
            className="btn primary"
            href={`/login?redirect=/checkin/${slug}`}
            style={{ padding: "14px", fontSize: 16, textDecoration: "none", textAlign: "center" }}
          >
            Accedi
          </Link>
          <Link
            className="btn"
            href={`/signup?redirect=/checkin/${slug}`}
            style={{ textDecoration: "none", textAlign: "center" }}
          >
            Registrati
          </Link>
        </div>
      </div>
    );
  }

  const supabase = createSupabaseAdminClient();

  // ── Carica spot
  const { data: venue, error } = await supabase
    .from("venues")
    .select("id,name,city,slug,indirizzo,categoria,lat,lng,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !venue) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
        <h1 style={{ margin: "0 0 10px", fontWeight: 900 }}>Spot non trovato</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Controlla che il QR code sia leggibile e riprova.
        </p>
        <Link className="btn" href="/">← Home</Link>
      </div>
    );
  }

  const v = venue as Venue;

  if (v.is_active === false) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ margin: "0 0 10px", fontWeight: 900 }}>{v.name}</h1>
        <div
          className="notice"
          style={{
            borderColor: "rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.06)",
            color: "#dc2626",
          }}
        >
          Questo spot non è più attivo. Il check-in non è disponibile.
        </div>
        <Link className="btn" href="/" style={{ marginTop: 16, display: "inline-block" }}>
          ← Home
        </Link>
      </div>
    );
  }

  // ── Preload dati sessione lato server (evita chiamate API extra dal client)
  const { start, end } = todayRange();

  // Scontrino già caricato oggi per questo spot?
  const { data: todayReceipt } = await supabase
    .from("receipt_verifications")
    .select("id,status")
    .eq("user_id", scUid)
    .eq("venue_id", v.id)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initialReceiptId = todayReceipt?.id ?? null;
  const initialReceiptStatus = (todayReceipt?.status as "pending" | "approved" | "rejected" | null) ?? null;

  // Utente ha votato negli ultimi 7 giorni?
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: lastVote } = await supabase
    .from("spot_ratings")
    .select("created_at")
    .eq("user_id", scUid)
    .eq("venue_id", v.id)
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasVotedRecently = !!lastVote;
  const nextVoteAt = lastVote
    ? new Date(new Date(lastVote.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header spot — mobile first */}
      <div
        style={{
          textAlign: "center",
          padding: "28px 20px 20px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          marginBottom: 24,
        }}
      >
        <div style={{ marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CityQuest" style={{ height: 48, width: 48, borderRadius: 12 }} />
        </div>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
        <h1 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 26 }}>{v.name}</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          {[v.city, v.categoria ? v.categoria.charAt(0).toUpperCase() + v.categoria.slice(1) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {v.indirizzo && (
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
            {v.indirizzo}
          </p>
        )}
      </div>

      {/* Flusso 3 step */}
      <div style={{ padding: "0 20px" }}>
        <CheckinClient
          slug={v.slug}
          venueId={v.id}
          venueName={v.name}
          spotLat={v.lat}
          spotLng={v.lng}
          initialReceiptId={initialReceiptId}
          initialReceiptStatus={initialReceiptStatus}
          hasVotedRecently={hasVotedRecently}
          nextVoteAt={nextVoteAt}
        />
      </div>
    </div>
  );
}
