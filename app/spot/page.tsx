import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import AdminQrDownload from "@/components/AdminQrDownload";
import RedeemCodeForm from "@/components/RedeemCodeForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Tipi ────────────────────────────────────────────────────────────────────

type VenueRow = {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
};

type Kpi = {
  scans_today: number;
  votes_today: number;
  scans_7d: number;
  votes_7d: number;
  scans_live_10m: number;
};

type EventRow = {
  id: string;
  event_type: string | null;
  created_at: string;
  user_id: string | null;
};

type ReceiptRow = {
  id: string;
  ai_result: { extracted?: { importo?: number | null } } | null;
  created_at: string;
};

type PromoRow = {
  id: string;
  title: string;
  promo_type: string;
  is_active: boolean;
  created_at: string;
};

type RatingRow = {
  rating: number;
  created_at: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const GIORNI_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function isoDay(iso: string) {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function buildDailyVisits(events: EventRow[]): { label: string; value: number }[] {
  const today = new Date();
  const days: { label: string; day: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const label = i === 0 ? "oggi" : GIORNI_SHORT[d.getDay()];
    days.push({ label, day: dayStr, value: 0 });
  }
  events.forEach((ev) => {
    const day = isoDay(ev.created_at);
    const slot = days.find((d) => d.day === day);
    if (slot) slot.value++;
  });
  return days.map(({ label, value }) => ({ label, value }));
}

function buildHourlyDistribution(events: EventRow[]): { label: string; value: number }[] {
  const hours: { label: string; value: number }[] = Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, "0")}`,
    value: 0,
  }));
  events.forEach((ev) => {
    const h = new Date(ev.created_at).getHours();
    hours[h].value++;
  });
  return hours;
}

function groupTopVisitors(events: EventRow[]): { userId: string; count: number }[] {
  const map = new Map<string, number>();
  events.forEach((ev) => {
    if (!ev.user_id) return;
    map.set(ev.user_id, (map.get(ev.user_id) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

// ── Componente grafico a barre (puro CSS) ────────────────────────────────────

function BarChart({
  data,
  color = "rgba(99,102,241,0.75)",
  height = 72,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: height + 28 }}>
      {data.map((d) => {
        const barH = Math.round((d.value / maxVal) * height);
        return (
          <div
            key={d.label}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
          >
            {d.value > 0 && (
              <div style={{ fontSize: 9, color: "rgba(15,23,42,0.5)", lineHeight: 1 }}>{d.value}</div>
            )}
            <div
              style={{
                width: "100%",
                height: barH > 0 ? barH : 2,
                background: barH > 0 ? color : "rgba(0,0,0,0.08)",
                borderRadius: "3px 3px 0 0",
                transition: "height 300ms ease",
              }}
            />
            <div style={{ fontSize: 9, color: "rgba(15,23,42,0.45)", lineHeight: 1 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SpotDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/spot/login");

  const admin = await isAdmin(user.id);
  if (admin) redirect("/admin");

  const supabase = createSupabaseAdminClient();

  // Spot associato (owner_user_id = auth uid)
  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id,name,city,slug")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (vErr) {
    return (
      <div className="card">
        <h1 className="h1">Dashboard Spot</h1>
        <div className="notice">Errore DB: {vErr.message}</div>
        <Link className="btn" href="/">← Home</Link>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="card">
        <h1 className="h1">Dashboard Spot</h1>
        <div className="notice">Nessuno spot associato a questo account.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Link className="btn" href="/">← Home</Link>
          <Link className="btn" href="/spot/login">Cambia account</Link>
        </div>
      </div>
    );
  }

  const v = venue as VenueRow;
  const publicHref = v.slug ? `/v/${v.slug}` : null;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // ── Query parallele ────────────────────────────────────────────────────────
  const [kpiRes, promoRes, recentEventsRes, allScansRes, receiptsRes, ratingsRes, lbRes] = await Promise.all([
    // KPI via RPC esistente
    supabase.rpc("get_venue_kpis", { p_venue_id: v.id }),

    // Promo
    supabase
      .from("venue_promos")
      .select("id,title,promo_type,is_active,created_at")
      .eq("venue_id", v.id)
      .order("created_at", { ascending: false })
      .limit(10),

    // Ultimi 20 eventi (log recente)
    supabase
      .from("venue_events")
      .select("id,event_type,points,created_at,user_id")
      .eq("venue_id", v.id)
      .order("created_at", { ascending: false })
      .limit(20),

    // Tutti gli scan degli ultimi 7gg (per grafico giornaliero + orario)
    supabase
      .from("user_events")
      .select("id,created_at,user_id")
      .eq("venue_id", v.id)
      .eq("event_type", "scan")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: true }),

    // Scontrini approvati
    supabase
      .from("receipt_verifications")
      .select("id,ai_result,created_at")
      .eq("venue_id", v.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50),

    // Rating
    supabase
      .from("venue_ratings")
      .select("rating,created_at")
      .eq("venue_id", v.id)
      .order("created_at", { ascending: false })
      .limit(50),

    // Score totale
    supabase.from("leaderboard_venues").select("score").eq("id", v.id).maybeSingle(),
  ]);

  // ── KPI ────────────────────────────────────────────────────────────────────
  const kpiRaw = Array.isArray(kpiRes.data) ? kpiRes.data[0] : kpiRes.data;
  const kpis: Kpi = {
    scans_today: Number(kpiRaw?.scans_today ?? 0),
    votes_today: Number(kpiRaw?.votes_today ?? 0),
    scans_7d: Number(kpiRaw?.scans_7d ?? 0),
    votes_7d: Number(kpiRaw?.votes_7d ?? 0),
    scans_live_10m: Number(kpiRaw?.scans_live_10m ?? 0),
  };

  // ── Aggregati grafici ──────────────────────────────────────────────────────
  const scans7d = (allScansRes.data ?? []) as EventRow[];
  const dailyData = buildDailyVisits(scans7d);
  const hourlyData = buildHourlyDistribution(scans7d);
  const topVisitorsRaw = groupTopVisitors(scans7d);

  // Nomi visitatori
  let topVisitors: { name: string; count: number }[] = [];
  if (topVisitorsRaw.length > 0) {
    const ids = topVisitorsRaw.map((v) => v.userId);
    const { data: usersData } = await supabase
      .from("sc_users")
      .select("id,name")
      .in("id", ids);
    const nameMap = new Map((usersData ?? []).map((u: { id: string; name: string }) => [u.id, u.name]));
    topVisitors = topVisitorsRaw.map((v) => ({
      name: String(nameMap.get(v.userId) ?? "Guest"),
      count: v.count,
    }));
  }

  // ── Scontrini ─────────────────────────────────────────────────────────────
  const receipts = (receiptsRes.data ?? []) as ReceiptRow[];
  const amounts = receipts
    .map((r) => {
      const imp = r.ai_result?.extracted?.importo;
      return typeof imp === "number" ? imp : null;
    })
    .filter((x): x is number => x !== null);
  const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : null;

  // ── Rating ────────────────────────────────────────────────────────────────
  const ratings = (ratingsRes.data ?? []) as RatingRow[];
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b.rating, 0) / ratings.length) * 10) / 10
      : null;

  // ── Promos ────────────────────────────────────────────────────────────────
  const promos = (promoRes.data ?? []) as PromoRow[];
  const activePromo = promos.find((p) => p.is_active) ?? null;

  const totalScore = Number(lbRes.data?.score ?? 0);

  // ── Fascia oraria di punta ────────────────────────────────────────────────
  const peakHour = hourlyData.reduce((best, h) => (h.value > best.value ? h : best), hourlyData[0]);

  return (
    <div className="page">

      {/* ── HEADER ── */}
      <div className="card">
        <div className="cardHead">
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>Dashboard Spot</h1>
            <p className="muted" style={{ margin: 0 }}>
              <b>{v.name}</b>{v.city ? ` · ${v.city}` : ""} · Punti totali: <b>{totalScore.toLocaleString("it-IT")}</b>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn" href="/">← Home</Link>
            {publicHref && (
              <Link className="btn primary" href={publicHref} target="_blank">Pagina pubblica</Link>
            )}
          </div>
        </div>

        {/* Live alert */}
        {kpis.scans_live_10m > 0 && (
          <div
            className="notice"
            style={{
              marginTop: 12,
              borderColor: "rgba(16,185,129,0.3)",
              background: "rgba(16,185,129,0.06)",
              color: "#059669",
              fontWeight: 700,
            }}
          >
            🟢 {kpis.scans_live_10m} {kpis.scans_live_10m === 1 ? "persona" : "persone"} negli ultimi 10 minuti
          </div>
        )}
      </div>

      {/* ── QR CHECK-IN ── */}
      {v.slug && (
        <div className="card" style={{ marginTop: 14 }}>
          <h2 className="h2" style={{ marginTop: 0, marginBottom: 10 }}>QR Code Check-in</h2>
          <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
            Stampa e affiggi questo QR nello spot. Gli utenti lo scansioneranno per registrare la presenza e guadagnare punti.
          </p>
          <AdminQrDownload
            slug={v.slug}
            venueName={v.name}
            siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
          />
        </div>
      )}

      {/* ── KPI RAPIDI ── */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 12 }}>Statistiche rapide</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {[
            { label: "Scan oggi", value: kpis.scans_today, icon: "📍" },
            { label: "Voti oggi", value: kpis.votes_today, icon: "⭐" },
            { label: "Scan 7 giorni", value: kpis.scans_7d, icon: "📅" },
            { label: "Voti 7 giorni", value: kpis.votes_7d, icon: "🗳️" },
            { label: "Rating medio", value: avgRating != null ? `${avgRating}/5` : "—", icon: "💛" },
            { label: "Scontrini approvati", value: receipts.length, icon: "🧾" },
            { label: "Spesa media", value: avgAmount != null ? `€${avgAmount.toFixed(2)}` : "—", icon: "💰" },
          ].map((k) => (
            <div key={k.label} className="card soft" style={{ padding: "14px 12px" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
              <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── GRAFICO VISITE GIORNALIERE ── */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 4 }}>Visite ultimi 7 giorni</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 13 }}>
          Scan registrati per giorno
          {peakHour.value > 0 && (
            <> · Ora di punta: <b>{peakHour.label}:00–{peakHour.label}:59</b> ({peakHour.value} scan 7gg)</>
          )}
        </p>
        {scans7d.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Nessuno scan negli ultimi 7 giorni.</div>
        ) : (
          <BarChart data={dailyData} color="rgba(99,102,241,0.75)" />
        )}
      </div>

      {/* ── DISTRIBUZIONE ORARIA ── */}
      {scans7d.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h2 className="h2" style={{ marginTop: 0, marginBottom: 4 }}>Fasce orarie (ultimi 7 gg)</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 13 }}>
            Distribuzione scan per ora del giorno
          </p>
          <BarChart data={hourlyData} color="rgba(236,72,153,0.65)" height={56} />
        </div>
      )}

      {/* ── TOP VISITATORI ── */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 12 }}>Top visitatori (7 giorni)</h2>
        {topVisitors.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Nessun visitatore negli ultimi 7 giorni.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {topVisitors.map((v, i) => (
              <div
                key={i}
                className="notice"
                style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontWeight: 900, fontSize: 16, minWidth: 24 }}>{i + 1}</span>
                  <span style={{ fontWeight: 700 }}>{v.name}</span>
                </div>
                <span className="badge">{v.count} {v.count === 1 ? "visita" : "visite"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SCONTRINI APPROVATI ── */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 12 }}>Scontrini approvati</h2>
        {receipts.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Nessuno scontrino approvato ancora.</div>
        ) : (
          <>
            <div className="notice" style={{ marginBottom: 10 }}>
              Totale: <b>{receipts.length}</b> scontrini ·
              Importo medio: <b>{avgAmount != null ? `€${avgAmount.toFixed(2)}` : "—"}</b>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th style={{ textAlign: "right" }}>Importo</th>
                </tr>
              </thead>
              <tbody>
                {receipts.slice(0, 10).map((r) => {
                  const imp = r.ai_result?.extracted?.importo;
                  return (
                    <tr key={r.id}>
                      <td className="muted" style={{ fontSize: 13 }}>{fmtDateTime(r.created_at)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {typeof imp === "number" ? `€${imp.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ── RATING ── */}
      {ratings.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h2 className="h2" style={{ marginTop: 0, marginBottom: 12 }}>Rating spot</h2>
          <div className="notice" style={{ marginBottom: 10 }}>
            Media: <b>{avgRating}/5</b> su <b>{ratings.length}</b> voti
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const cnt = ratings.filter((r) => r.rating === star).length;
              const pct = ratings.length > 0 ? Math.round((cnt / ratings.length) * 100) : 0;
              return (
                <div key={star} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {cnt > 0 && <div style={{ fontSize: 9, color: "rgba(15,23,42,0.5)" }}>{cnt}</div>}
                  <div
                    style={{
                      width: "100%",
                      height: Math.max(pct * 0.6, cnt > 0 ? 4 : 2),
                      background: cnt > 0 ? "rgba(245,158,11,0.75)" : "rgba(0,0,0,0.08)",
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                  <div style={{ fontSize: 10, color: "rgba(15,23,42,0.5)" }}>{"⭐".repeat(star)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STORICO PROMO ── */}
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 className="h2" style={{ margin: 0 }}>Promo</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="notice" style={{ padding: "4px 10px", fontSize: 13 }}>
              Attiva: <b>{activePromo ? activePromo.title : "—"}</b>
            </span>
          </div>
        </div>
        {promos.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Nessuna promo ancora.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Titolo</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th style={{ textAlign: "right" }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.title}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{p.promo_type}</td>
                  <td>
                    {p.is_active
                      ? <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}>✅ Attiva</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td style={{ textAlign: "right" }} className="muted">{new Date(p.created_at).toLocaleDateString("it-IT")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── RISCATTA PREMIO ── */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 12 }}>🏆 Valida codice riscatto premio</h2>
        <RedeemCodeForm />
      </div>

      {/* ── ATTIVITÀ RECENTE ── */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0, marginBottom: 12 }}>Attività recente</h2>
        {(recentEventsRes.data ?? []).length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Nessuna attività ancora.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th className="score">Punti</th>
              </tr>
            </thead>
            <tbody>
              {(recentEventsRes.data ?? []).map((ev: any) => (
                <tr key={ev.id}>
                  <td className="muted" style={{ fontSize: 13 }}>{fmtDateTime(ev.created_at)}</td>
                  <td style={{ fontWeight: 700 }}>
                    {ev.event_type === "scan" ? "📍 Scan" : ev.event_type === "vote" ? "⭐ Voto" : ev.event_type ?? "—"}
                  </td>
                  <td className="score">{Number(ev.points ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
