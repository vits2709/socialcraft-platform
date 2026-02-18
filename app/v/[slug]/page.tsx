import Link from "next/link";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import VisitFlow from "@/components/VisitFlow";
import SpotOpenNow from "@/components/SpotOpenNow";
import SpotGallery from "@/components/SpotGallery";
import SpotMapLoader from "@/components/SpotMapLoader";

export const runtime = "nodejs";

type OrariGiorno = { apertura: string; chiusura: string; chiuso: boolean };
type OrariData = Record<string, OrariGiorno>;

type Venue = {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
  indirizzo: string | null;
  telefono: string | null;
  sito_web: string | null;
  categoria: string | null;
  fascia_prezzo: number | null;
  servizi: string[] | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  orari: OrariData | null;
  foto: string[] | null;
  lat: number | null;
  lng: number | null;
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

function PrezzoLabel({ n }: { n: number }) {
  return (
    <span style={{ fontWeight: 700, color: "#059669" }}>
      {"€".repeat(n)}
      <span style={{ opacity: 0.3 }}>{"€".repeat(3 - n)}</span>
    </span>
  );
}

const GIORNI_LABEL: Record<string, string> = {
  lun: "Lun", mar: "Mar", mer: "Mer", gio: "Gio",
  ven: "Ven", sab: "Sab", dom: "Dom",
};

export default async function VenuePublicPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const supabase = await createSupabaseServerClientReadOnly();

  const { data: venue, error } = await supabase
    .from("venues")
    .select(
      "id,name,city,slug,indirizzo,telefono,sito_web,categoria,fascia_prezzo,servizi,is_active,is_featured,orari,foto,lat,lng"
    )
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

  // Rating summary
  const { data: rs } = await supabase
    .from("spot_rating_summary")
    .select("venue_id,avg_rating,ratings_count")
    .eq("venue_id", v.id)
    .maybeSingle();

  const summary = (rs as RatingSummary | null) ?? null;
  const avg = Number(summary?.avg_rating ?? 0);
  const count = Number(summary?.ratings_count ?? 0);

  // Unique visitors via venue_leaderboard
  const { data: lb } = await supabase
    .from("venue_leaderboard")
    .select("visits_count")
    .eq("id", v.id)
    .maybeSingle();
  const visitsCount = Number((lb as { visits_count?: number } | null)?.visits_count ?? 0);

  const hasOrari = v.orari && Object.keys(v.orari).length > 0;
  const hasFoto = v.foto && v.foto.length > 0;
  const hasMap = v.lat != null && v.lng != null;

  return (
    <div className="card">
      {/* Spot non attivo */}
      {v.is_active === false && (
        <div
          className="notice"
          style={{
            marginBottom: 14,
            borderColor: "rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.06)",
            color: "#dc2626",
            fontWeight: 600,
          }}
        >
          ⚠️ Questo spot non è più attivo.
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
            {v.name}
          </h1>
          <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>
            {v.city ?? "—"}
            {v.categoria ? ` · ${v.categoria.charAt(0).toUpperCase() + v.categoria.slice(1)}` : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {v.is_featured && (
            <span
              className="badge"
              style={{
                background: "rgba(99,102,241,0.10)",
                borderColor: "rgba(99,102,241,0.30)",
                color: "#6366f1",
                fontWeight: 800,
              }}
            >
              🏅 Spot Verificato
            </span>
          )}
          {hasOrari && (
            <SpotOpenNow orari={v.orari!} />
          )}
          {v.fascia_prezzo && <PrezzoLabel n={v.fascia_prezzo} />}
        </div>
      </div>

      {/* Info row */}
      {(v.indirizzo || v.telefono || v.sito_web) && (
        <div
          className="notice"
          style={{ marginTop: 14, display: "grid", gap: 6 }}
        >
          {v.indirizzo && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}>
              <span>📍</span>
              <span>{v.indirizzo}</span>
            </div>
          )}
          {v.telefono && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <span>📞</span>
              <a href={`tel:${v.telefono}`} style={{ color: "inherit" }}>
                {v.telefono}
              </a>
            </div>
          )}
          {v.sito_web && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <span>🌐</span>
              <a
                href={v.sito_web}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#6366f1", fontWeight: 600 }}
              >
                {v.sito_web.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Servizi */}
      {v.servizi && v.servizi.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            SERVIZI
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {v.servizi.map((s) => (
              <span
                key={s}
                className="badge"
                style={{ fontSize: 12 }}
              >
                {s === "WiFi" ? "📶" : s === "Parcheggio" ? "🅿️" : s === "Pagamento carta" ? "💳" : s === "Area fumatori" ? "🚬" : s === "Pet friendly" ? "🐾" : "✓"}{" "}
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Orari */}
      {hasOrari && (
        <details className="collapse" style={{ marginTop: 14 }}>
          <summary>
            🕐 Orari di apertura
          </summary>
          <div className="collapseBody">
            <div style={{ display: "grid", gap: 4 }}>
              {Object.entries(v.orari!).map(([key, day]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    borderRadius: 10,
                    fontSize: 13,
                    background: "rgba(255,255,255,0.7)",
                  }}
                >
                  <span style={{ fontWeight: 700, minWidth: 40 }}>
                    {GIORNI_LABEL[key] ?? key}
                  </span>
                  <span className="muted">
                    {day.chiuso ? "Chiuso" : `${day.apertura} – ${day.chiusura}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Rating + visitatori */}
      <div className="notice" style={{ marginTop: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900 }}>Valutazione Spot</div>
            <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              Media voti e numero votanti
            </div>
            {visitsCount > 0 && (
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                👥 {visitsCount} visitatori
              </div>
            )}
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

      {/* Galleria foto */}
      {hasFoto && (
        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            GALLERIA
          </div>
          <SpotGallery foto={v.foto!} />
        </div>
      )}

      {/* Mappa */}
      {hasMap && (
        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            POSIZIONE
          </div>
          <SpotMapLoader lat={v.lat!} lng={v.lng!} name={v.name} />
        </div>
      )}

      {/* Visit flow */}
      <div style={{ marginTop: 18 }}>
        <VisitFlow venueId={v.id} slug={v.slug!} />
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="btn" href="/">
          ← Leaderboard
        </Link>
        <Link className="btn" href="/map">
          🗺 Mappa spot
        </Link>
      </div>
    </div>
  );
}
