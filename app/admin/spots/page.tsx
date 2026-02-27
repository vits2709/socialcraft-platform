import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getVenueLeaderboard } from "@/lib/leaderboards";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteVenueAction } from "@/app/admin/actions";
import DeleteVenueButton from "@/components/DeleteVenueButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Kpi = { scans_today: number; votes_today: number };

type VenueExtra = {
  id: string;
  slug: string | null;
  categoria: string | null;
  is_active: boolean;
};

async function getKpisToday(venueId: string): Promise<Kpi> {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data } = await supabase.rpc("get_venue_kpis", { p_venue_id: venueId });
  const row = Array.isArray(data) ? data[0] : data;
  return {
    scans_today: Number(row?.scans_today ?? 0),
    votes_today: Number(row?.votes_today ?? 0),
  };
}

async function getActivePromoTitle(venueId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data } = await supabase.rpc("get_active_promo", { p_venue_id: venueId });
  const promo = Array.isArray(data) ? data[0] : null;
  return promo?.title ?? null;
}

function fmt(n: number) {
  return Number(n ?? 0).toLocaleString("it-IT");
}

function ratingStars(avg: number) {
  const full = Math.round(avg);
  return "⭐".repeat(Math.max(0, Math.min(5, full))) || "—";
}

const CATEGORIA_LABELS: Record<string, string> = {
  bar:           "Bar",
  ristorante:    "Ristorante",
  barber:        "Barber",
  parrucchiere:  "Parrucchiere",
  estetica:      "Estetica",
  palestra:      "Palestra",
  altro:         "Altro",
};

export default async function AdminSpotsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const supabase = createSupabaseAdminClient();

  // Fetch base leaderboard + extra venue data in parallel
  const [venues, extraRaw] = await Promise.all([
    getVenueLeaderboard(500),
    supabase
      .from("venues")
      .select("id, slug, categoria, is_active")
      .limit(500),
  ]);

  const venueExtras = new Map<string, VenueExtra>(
    (extraRaw.data ?? []).map((v: VenueExtra) => [String(v.id), v])
  );

  // Fetch per-venue KPIs + promo in parallel
  const enriched = await Promise.all(
    venues.map(async (v) => {
      const id = String(v.id);
      const [kpis, promoTitle] = await Promise.all([
        getKpisToday(id),
        getActivePromoTitle(id),
      ]);
      return { ...v, id, kpis, promoTitle, extra: venueExtras.get(id) ?? null };
    })
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
            📍 Spot
          </h1>
          <p style={{ margin: "4px 0 0", color: "rgba(15,23,42,0.5)", fontSize: 13 }}>
            {enriched.length} spot in classifica
          </p>
        </div>
        <Link className="btn primary" href="/admin/create-venue" style={{ padding: "10px 20px", fontWeight: 700 }}>
          + Nuovo Spot
        </Link>
      </div>

      {/* Tabella */}
      <div
        style={{
          background: "white",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.07)",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#2D1B69" }}>
              {["#", "Nome", "Città", "Categoria", "Rating", "Visite", "Scan oggi", "Stato", "Promo", "Azioni"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 14px",
                    textAlign: h === "#" || h === "Rating" || h === "Visite" || h === "Scan oggi" ? "center" : "left",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.3px",
                    color: "white",
                    whiteSpace: "nowrap",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enriched.map((v, i) => {
              const isOdd = i % 2 === 1;
              const active = v.extra?.is_active !== false;
              return (
                <tr
                  key={v.id}
                  style={{
                    background: isOdd ? "rgba(45,27,105,0.02)" : "white",
                    transition: "background 100ms",
                  }}
                >
                  <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 700, color: "rgba(15,23,42,0.4)", fontSize: 12 }}>
                    {i + 1}
                  </td>

                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{v.name}</div>
                  </td>

                  <td style={{ padding: "11px 14px", color: "rgba(15,23,42,0.6)", whiteSpace: "nowrap" }}>
                    {v.city ?? "—"}
                  </td>

                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                      {CATEGORIA_LABELS[v.extra?.categoria ?? ""] ?? v.extra?.categoria ?? "—"}
                    </span>
                  </td>

                  <td style={{ padding: "11px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <span title={`${Number(v.avg_rating ?? 0).toFixed(2)}/5 (${v.ratings_count ?? 0} voti)`}>
                      {ratingStars(Number(v.avg_rating ?? 0))}
                    </span>
                  </td>

                  <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 600 }}>
                    {fmt(Number(v.visits_count ?? 0))}
                  </td>

                  <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 700, color: "#2D1B69" }}>
                    {fmt(v.kpis.scans_today)}
                  </td>

                  <td style={{ padding: "11px 14px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
                        color: active ? "#059669" : "#dc2626",
                        border: `1px solid ${active ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.20)"}`,
                      }}
                    >
                      {active ? "Attivo" : "Inattivo"}
                    </span>
                  </td>

                  <td style={{ padding: "11px 14px" }}>
                    {v.promoTitle ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "rgba(123,192,67,0.12)",
                          color: "#3d7a0a",
                          border: "1px solid rgba(123,192,67,0.25)",
                          whiteSpace: "nowrap",
                          maxWidth: 140,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={v.promoTitle}
                      >
                        🎁 {v.promoTitle}
                      </span>
                    ) : (
                      <span style={{ color: "rgba(15,23,42,0.3)", fontSize: 12 }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Link
                        href={`/admin/venues/${v.id}`}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          background: "#2D1B69",
                          color: "white",
                          textDecoration: "none",
                        }}
                      >
                        Gestisci
                      </Link>

                      {v.extra?.slug ? (
                        <a
                          href={`/v/${v.extra.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "5px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            background: "rgba(0,0,0,0.06)",
                            color: "#0f172a",
                            textDecoration: "none",
                          }}
                        >
                          Apri
                        </a>
                      ) : null}

                      <form action={deleteVenueAction.bind(null, v.id)}>
                        <DeleteVenueButton venueName={v.name} />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {enriched.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "rgba(15,23,42,0.4)" }}>
            Nessuno Spot trovato. <Link href="/admin/create-venue" style={{ color: "#2D1B69", fontWeight: 700 }}>Crea il primo</Link>
          </div>
        )}
      </div>
    </div>
  );
}
