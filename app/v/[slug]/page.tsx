import Link from "next/link";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  instagram: string | null;
  facebook: string | null;
  categoria: string | null;
  fascia_prezzo: number | null;
  servizi: string[] | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  orari: OrariData | null;
  foto: string[] | null;
  lat: number | null;
  lng: number | null;
  cover_image: string | null;
};

type RatingSummary = {
  venue_id: string;
  avg_rating: number | null;
  ratings_count: number | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIA_GRADIENT: Record<string, string> = {
  bar:          "135deg, #6366f1 0%, #8b5cf6 100%",
  ristorante:   "135deg, #f97316 0%, #ef4444 100%",
  pub:          "135deg, #d97706 0%, #92400e 100%",
  caffetteria:  "135deg, #92400e 0%, #b45309 100%",
  club:         "135deg, #7c3aed 0%, #db2777 100%",
  barber:       "135deg, #0891b2 0%, #2563eb 100%",
  parrucchiere: "135deg, #db2777 0%, #9333ea 100%",
  estetica:     "135deg, #e11d48 0%, #f472b6 100%",
  palestra:     "135deg, #2563eb 0%, #0891b2 100%",
  altro:        "135deg, #475569 0%, #334155 100%",
};

const CAT_EMOJI: Record<string, string> = {
  bar: "🍹", ristorante: "🍽️", pub: "🍺", caffetteria: "☕", club: "🎵",
  barber: "✂️", parrucchiere: "💇", estetica: "💅", palestra: "🏋️", altro: "📍",
};

const GIORNI_LABEL: Record<string, string> = {
  lun: "Lunedì", mar: "Martedì", mer: "Mercoledì", gio: "Giovedì",
  ven: "Venerdì", sab: "Sabato", dom: "Domenica",
};
const GIORNI_ORDER = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const GIORNO_MAP: Record<number, string> = {
  0: "dom", 1: "lun", 2: "mar", 3: "mer", 4: "gio", 5: "ven", 6: "sab",
};

const SERVIZI_META: Record<string, { emoji: string; color: string; bg: string }> = {
  "WiFi":            { emoji: "📶", color: "#2563eb", bg: "rgba(37,99,235,0.08)" },
  "Parcheggio":      { emoji: "🅿️", color: "#0891b2", bg: "rgba(8,145,178,0.08)" },
  "Pagamento carta": { emoji: "💳", color: "#059669", bg: "rgba(5,150,105,0.08)" },
  "Area fumatori":   { emoji: "🚬", color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
  "Pet friendly":    { emoji: "🐾", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
};

const AVATAR_COLORS = ["#f59e0b", "#6366f1", "#10b981", "#ef4444", "#8b5cf6"];

function Stars({ value, size = 18 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span style={{ display: "inline-flex", gap: 1, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{ fontSize: size, color: i <= rounded ? "#fbbf24" : "#e2e8f0", lineHeight: 1 }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function PrezzoLabel({ n }: { n: number }) {
  return (
    <span style={{ fontWeight: 700, letterSpacing: 1 }}>
      <span style={{ color: "#059669" }}>{"€".repeat(n)}</span>
      <span style={{ color: "rgba(0,0,0,0.2)" }}>{"€".repeat(3 - n)}</span>
    </span>
  );
}

// Section wrapper component (inline to avoid "use client" complications)
function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: "16px",
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.07)",
        background: "rgba(255,255,255,0.6)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "#64748b",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function VenuePublicPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const supabase = await createSupabaseServerClientReadOnly();
  const adminSupabase = createSupabaseAdminClient();

  const { data: venue, error } = await supabase
    .from("venues")
    .select(
      "id,name,city,slug,indirizzo,telefono,sito_web,instagram,facebook,categoria,fascia_prezzo,servizi,is_active,is_featured,orari,foto,lat,lng,cover_image"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !venue) {
    return (
      <div className="card">
        <h1 className="h1">Spot</h1>
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

  // Rating distribution
  const { data: ratingsData } = await adminSupabase
    .from("venue_ratings")
    .select("rating")
    .eq("venue_id", v.id);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of (ratingsData ?? []) as { rating: number }[]) {
    const star = Math.round(r.rating);
    if (star >= 1 && star <= 5) distribution[star]++;
  }

  // Unique visitors via venue_leaderboard
  const { data: lb } = await supabase
    .from("venue_leaderboard")
    .select("visits_count")
    .eq("id", v.id)
    .maybeSingle();
  const visitsCount = Number((lb as { visits_count?: number } | null)?.visits_count ?? 0);

  // Top 5 visitatori (ultimi 30 giorni)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: scanEvents } = await adminSupabase
    .from("user_events")
    .select("user_id")
    .eq("venue_id", v.id)
    .eq("event_type", "scan")
    .gte("created_at", thirtyDaysAgo);

  const visitMap = new Map<string, number>();
  for (const e of (scanEvents ?? []) as { user_id: string }[]) {
    visitMap.set(e.user_id, (visitMap.get(e.user_id) ?? 0) + 1);
  }
  const topVisitorEntries = [...visitMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let topVisitors: { name: string; count: number }[] = [];
  if (topVisitorEntries.length > 0) {
    const ids = topVisitorEntries.map(([id]) => id);
    const { data: usersData } = await adminSupabase
      .from("sc_users")
      .select("id,name")
      .in("id", ids);
    const nameMap = new Map(
      ((usersData ?? []) as { id: string; name: string }[]).map((u) => [u.id, u.name])
    );
    topVisitors = topVisitorEntries.map(([userId, visitCount]) => ({
      name: String(nameMap.get(userId) ?? "Ospite"),
      count: visitCount,
    }));
  }

  // QR code check-in (server-side)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const checkinUrl = v.slug ? `${siteUrl}/checkin/${v.slug}` : null;
  let qrDataUrl: string | null = null;
  if (checkinUrl && siteUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 180, margin: 1, color: { dark: "#1e1b4b", light: "#ffffff" } });
    } catch (_) {}
  }

  // Detect logged-in user via sc_uid cookie
  const cookieStore = await cookies();
  const isLoggedIn = !!(cookieStore.get("sc_uid")?.value?.trim());

  // Today key (server-side, Europe/Rome)
  const nowRome = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const todayKey = GIORNO_MAP[nowRome.getDay()];

  const hasOrari = v.orari && Object.keys(v.orari).length > 0;
  const hasMap = v.lat != null && v.lng != null;
  const catGradient = CATEGORIA_GRADIENT[v.categoria ?? ""] ?? CATEGORIA_GRADIENT.altro;

  // Google Maps URLs
  const mapsSearchUrl = v.indirizzo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.indirizzo)}`
    : `https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}`;
  const mapsDirectionsUrl = v.indirizzo
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.indirizzo)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* ── COVER HEADER ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          height: "clamp(200px, 35vw, 280px)",
          background: v.cover_image
            ? undefined
            : `linear-gradient(${catGradient})`,
          overflow: "hidden",
        }}
      >
        {v.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.cover_image}
            alt={v.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {/* Dark gradient overlay at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0) 100%)",
            padding: "48px 18px 18px",
          }}
        >
          <h1
            style={{
              color: "white",
              margin: 0,
              fontSize: "clamp(22px, 5vw, 32px)",
              fontWeight: 900,
              letterSpacing: -0.5,
              textShadow: "0 2px 12px rgba(0,0,0,0.4)",
              lineHeight: 1.15,
            }}
          >
            {v.name}
          </h1>
          {(v.categoria || v.indirizzo) && (
            <p
              style={{
                color: "rgba(255,255,255,0.82)",
                margin: "5px 0 10px",
                fontSize: 14,
                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }}
            >
              {v.categoria && (
                <span>{CAT_EMOJI[v.categoria] ?? "📍"} {v.categoria.charAt(0).toUpperCase() + v.categoria.slice(1)}</span>
              )}
              {v.indirizzo && (
                <span style={{ opacity: 0.85 }}> · {v.indirizzo}</span>
              )}
            </p>
          )}
          {/* Badges */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {v.is_featured && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  background: "rgba(99,102,241,0.85)", color: "white", backdropFilter: "blur(4px)",
                }}
              >
                🏅 Verificato
              </span>
            )}
            {hasOrari && <SpotOpenNow orari={v.orari!} />}
            {v.fascia_prezzo && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  background: "rgba(0,0,0,0.45)", color: "white", backdropFilter: "blur(4px)",
                  letterSpacing: 1,
                }}
              >
                {"€".repeat(v.fascia_prezzo)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 16px 24px" }}>

        {/* Warning: spot non attivo */}
        {v.is_active === false && (
          <div
            className="notice"
            style={{
              marginBottom: 16,
              borderColor: "rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.06)",
              color: "#dc2626",
              fontWeight: 600,
            }}
          >
            ⚠️ Questo spot non è più attivo.
          </div>
        )}

        {/* ── Contatti ─────────────────────────────────────────────────── */}
        {(v.telefono || v.instagram || v.facebook || v.sito_web) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {v.telefono && (
              <a
                href={`tel:${v.telefono}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.2)",
                  color: "#059669", textDecoration: "none",
                }}
              >
                📞 {v.telefono}
              </a>
            )}
            {v.instagram && (
              <a
                href={`https://instagram.com/${v.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: "rgba(219,39,119,0.07)", border: "1px solid rgba(219,39,119,0.2)",
                  color: "#db2777", textDecoration: "none",
                }}
              >
                📸 {v.instagram}
              </a>
            )}
            {v.facebook && (
              <a
                href={v.facebook}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.2)",
                  color: "#2563eb", textDecoration: "none",
                }}
              >
                📘 Facebook
              </a>
            )}
            {v.sito_web && (
              <a
                href={v.sito_web}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)",
                  color: "#6366f1", textDecoration: "none",
                }}
              >
                🌐 {v.sito_web.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
          </div>
        )}

        {/* ── Servizi ──────────────────────────────────────────────────── */}
        {v.servizi && v.servizi.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {v.servizi.map((s) => {
              const meta = SERVIZI_META[s];
              return (
                <span
                  key={s}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: meta?.bg ?? "rgba(0,0,0,0.04)",
                    border: `1px solid ${meta ? meta.bg.replace("0.08", "0.2") : "rgba(0,0,0,0.1)"}`,
                    color: meta?.color ?? "#475569",
                  }}
                >
                  {meta?.emoji ?? "✓"} {s}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Orari ────────────────────────────────────────────────────── */}
        {hasOrari && (
          <Section>
            <SectionTitle>🕐 Orari di apertura</SectionTitle>
            <div style={{ display: "grid", gap: 3 }}>
              {GIORNI_ORDER.map((key) => {
                const day = v.orari![key];
                if (!day) return null;
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: isToday ? "rgba(99,102,241,0.07)" : "transparent",
                      border: `1px solid ${isToday ? "rgba(99,102,241,0.18)" : "transparent"}`,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: isToday ? 800 : 500,
                        fontSize: 14,
                        minWidth: 90,
                        color: isToday ? "#6366f1" : "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {isToday && (
                        <span
                          style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: "#6366f1", display: "inline-block", flexShrink: 0,
                          }}
                        />
                      )}
                      {GIORNI_LABEL[key]}
                      {isToday && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#a5b4fc" }}>
                          oggi
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isToday ? 700 : 400,
                        color: day.chiuso ? "#ef4444" : isToday ? "#1e293b" : "#64748b",
                      }}
                    >
                      {day.chiuso ? "Chiuso" : `${day.apertura} – ${day.chiusura}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Rating ───────────────────────────────────────────────────── */}
        <Section>
          <SectionTitle>⭐ Valutazione</SectionTitle>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {/* Score sintetico */}
            <div style={{ textAlign: "center", minWidth: 72 }}>
              <div
                style={{
                  fontSize: 44, fontWeight: 900, lineHeight: 1,
                  color: count ? "#1e293b" : "#cbd5e1",
                }}
              >
                {count ? avg.toFixed(1) : "—"}
              </div>
              <Stars value={avg} size={20} />
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {count} {count === 1 ? "voto" : "voti"}
              </div>
              {visitsCount > 0 && (
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  👥 {visitsCount} visit.
                </div>
              )}
            </div>
            {/* Distribuzione */}
            <div style={{ flex: 1 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const n = distribution[star] ?? 0;
                const pct = count > 0 ? (n / count) * 100 : 0;
                return (
                  <div
                    key={star}
                    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}
                  >
                    <span style={{ fontSize: 12, color: "#64748b", minWidth: 8 }}>{star}</span>
                    <span style={{ fontSize: 11 }}>★</span>
                    <div
                      style={{
                        flex: 1, height: 7, borderRadius: 4,
                        background: "rgba(0,0,0,0.06)", overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`, height: "100%",
                          background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 18, textAlign: "right" }}>
                      {n}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── Galleria ─────────────────────────────────────────────────── */}
        <Section>
          <SectionTitle>📷 Galleria</SectionTitle>
          <SpotGallery foto={v.foto ?? []} />
        </Section>

        {/* ── Mappa ────────────────────────────────────────────────────── */}
        {hasMap && (
          <Section>
            <SectionTitle>📍 Posizione</SectionTitle>
            <SpotMapLoader lat={v.lat!} lng={v.lng!} name={v.name} />
            {v.indirizzo && (
              <a
                href={mapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  marginTop: 12, fontSize: 14, fontWeight: 600,
                  color: "#6366f1", textDecoration: "none",
                }}
              >
                <span>📍</span>
                <span>{v.indirizzo}</span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>↗</span>
              </a>
            )}
            <a
              href={mapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                marginTop: 10, display: "inline-flex", alignItems: "center",
                gap: 6, textDecoration: "none",
              }}
            >
              🧭 Indicazioni
            </a>
          </Section>
        )}

        {/* ── Banner QR Check-in ────────────────────────────────────────── */}
        {v.is_active !== false && (
          <div
            style={{
              marginTop: 20,
              borderRadius: 18,
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #10b981 100%)",
              padding: "20px",
              display: "flex",
              gap: 16,
              alignItems: "center",
              boxShadow: "0 8px 32px rgba(99,102,241,0.25)",
            }}
          >
            {qrDataUrl && (
              <div
                style={{
                  background: "white",
                  borderRadius: 14,
                  padding: 8,
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR check-in ${v.name}`}
                  width={80}
                  height={80}
                  style={{ display: "block", borderRadius: 6 }}
                />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: "white", marginBottom: 5 }}>
                {isLoggedIn ? "📍 Sei qui?" : "🔑 Accedi per guadagnare"}
              </div>
              <div
                style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", marginBottom: 12, lineHeight: 1.4 }}
              >
                {isLoggedIn
                  ? "Scansiona il QR per guadagnare punti, caricare lo scontrino e votare."
                  : "Accedi a CityQuest per guadagnare punti quando visiti questo locale."}
              </div>
              {isLoggedIn ? (
                checkinUrl && (
                  <Link
                    href={checkinUrl}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "white", color: "#6366f1",
                      padding: "9px 18px", borderRadius: 999,
                      fontWeight: 800, fontSize: 14, textDecoration: "none",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    }}
                  >
                    Check-in →
                  </Link>
                )
              ) : (
                <Link
                  href="/login"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "white", color: "#6366f1",
                    padding: "9px 18px", borderRadius: 999,
                    fontWeight: 800, fontSize: 14, textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  }}
                >
                  Accedi →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Top Visitatori ───────────────────────────────────────────── */}
        {topVisitors.length > 0 && (
          <Section>
            <SectionTitle>👥 Top visitatori — ultimi 30 giorni</SectionTitle>
            <div style={{ display: "grid", gap: 8 }}>
              {topVisitors.map((tv, i) => (
                <div
                  key={`${tv.name}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background:
                      i === 0 ? "rgba(251,191,36,0.08)" :
                      i === 1 ? "rgba(148,163,184,0.07)" :
                      i === 2 ? "rgba(180,83,9,0.06)" :
                      "rgba(0,0,0,0.025)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: 20, minWidth: 28, textAlign: "center" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                  </span>
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 800, fontSize: 15, flexShrink: 0,
                    }}
                  >
                    {tv.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{tv.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {tv.count} {tv.count === 1 ? "visita" : "visite"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Footer nav ───────────────────────────────────────────────── */}
        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn" href="/">← Leaderboard</Link>
          <Link className="btn" href="/map">🗺 Mappa spot</Link>
        </div>
      </div>
    </div>
  );
}
