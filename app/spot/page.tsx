import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VenueRow = {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
  owner_user_id: string | null;
};

type Kpi = {
  scans_today: number;
  votes_today: number;
  scans_7d: number;
  votes_7d: number;
  scans_live_10m: number;
};

async function getKpis(venueId: string): Promise<Kpi> {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data, error } = await supabase.rpc("get_venue_kpis", { p_venue_id: venueId });
  if (error) {
    return {
      scans_today: 0,
      votes_today: 0,
      scans_7d: 0,
      votes_7d: 0,
      scans_live_10m: 0,
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    scans_today: Number(row?.scans_today ?? 0),
    votes_today: Number(row?.votes_today ?? 0),
    scans_7d: Number(row?.scans_7d ?? 0),
    votes_7d: Number(row?.votes_7d ?? 0),
    scans_live_10m: Number(row?.scans_live_10m ?? 0),
  };
}

async function getActivePromoTitle(venueId: string) {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data, error } = await supabase.rpc("get_active_promo", { p_venue_id: venueId });
  if (error) return null;
  const promo = Array.isArray(data) ? data[0] : null;
  return promo?.title ?? null;
}

type VenueEventRow = {
  id: string;
  event_type: string | null;
  points: number | null;
  created_at: string;
  user_id: string | null;
};

function niceEventLabel(t: string | null) {
  const k = (t ?? "").toLowerCase();
  if (k.includes("scan")) return "Scan";
  if (k.includes("vote")) return "Voto";
  if (k.includes("visit")) return "Visita";
  return t ?? "Evento";
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default async function SpotDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = await isAdmin(user.id);
  if (admin) redirect("/admin");

  const supabase = await createSupabaseServerClientReadOnly();

  // Spot associato (owner_user_id = auth uid)
  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id,name,city,slug,owner_user_id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (vErr) {
    return (
      <div className="card">
        <h1 className="h1">Dashboard Spot</h1>
        <div className="notice">Errore DB: {vErr.message}</div>
        <Link className="btn" href="/">
          ← Classifiche
        </Link>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="card">
        <h1 className="h1">Dashboard Spot</h1>
        <div className="notice">Nessuno spot associato a questo account.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Link className="btn" href="/">
            ← Classifiche
          </Link>
          <Link className="btn" href="/login">
            Cambia account
          </Link>
        </div>
      </div>
    );
  }

  const v = venue as VenueRow;
  const publicHref = v.slug ? `/v/${v.slug}` : null;

  const [kpis, promoTitle, eventsRes, lbRes] = await Promise.all([
    getKpis(v.id),
    getActivePromoTitle(v.id),
    supabase
      .from("venue_events")
      .select("id,event_type,points,created_at,user_id")
      .eq("venue_id", v.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("leaderboard_venues")
      .select("score")
      .eq("id", v.id)
      .maybeSingle(),
  ]);

  const events = (eventsRes.data ?? []) as VenueEventRow[];
  const totalScore = Number(lbRes.data?.score ?? 0);

  return (
    <div className="page">
      {/* HEADER */}
      <div className="card">
        <div className="cardHead">
          <div>
            <h1 className="h1" style={{ marginBottom: 6 }}>
              Dashboard Spot
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              Loggato come: <b>{user.email}</b>
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Link className="btn" href="/">
              ← Classifiche
            </Link>
            {publicHref ? (
              <Link className="btn primary" href={publicHref} target="_blank">
                Apri pagina pubblica
              </Link>
            ) : null}
          </div>
        </div>

        <div className="notice" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="muted">Spot</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{v.name}</div>
              <div className="muted">{v.city ?? "—"}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div className="muted">Slug pubblico</div>
              <div style={{ fontWeight: 800 }}>{v.slug ?? "—"}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Punti totali: <b>{totalScore.toLocaleString("it-IT")}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0 }}>
          Statistiche rapide
        </h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Dati live (scan/voti) + riepilogo ultimi 7 giorni.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 10,
            marginTop: 12,
          }}
        >
          <div className="card soft" style={{ padding: 14 }}>
            <div className="muted">Scan oggi</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{kpis.scans_today}</div>
          </div>

          <div className="card soft" style={{ padding: 14 }}>
            <div className="muted">Voti oggi</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{kpis.votes_today}</div>
          </div>

          <div className="card soft" style={{ padding: 14 }}>
            <div className="muted">Scan 7 giorni</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{kpis.scans_7d}</div>
          </div>

          <div className="card soft" style={{ padding: 14 }}>
            <div className="muted">Voti 7 giorni</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{kpis.votes_7d}</div>
          </div>

          <div className="card soft" style={{ padding: 14 }}>
            <div className="muted">Live 10m</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{kpis.scans_live_10m}</div>
          </div>
        </div>

        <div className="notice" style={{ marginTop: 12 }}>
          <b>Promo attiva:</b> {promoTitle ? promoTitle : <span className="muted">nessuna</span>}
        </div>

        {/* NB: QR voto e “conferma consumazione” NON li mettiamo qui ora */}
      </div>

      {/* ATTIVITÀ RECENTE */}
      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginTop: 0 }}>
          Attività recente
        </h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Ultimi 20 eventi registrati sullo Spot.
        </p>

        {eventsRes.error ? (
          <div className="notice">Errore eventi: {eventsRes.error.message}</div>
        ) : events.length === 0 ? (
          <div className="notice">Nessuna attività ancora.</div>
        ) : (
          <table className="table" aria-label="Attività recente">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th className="score">Punti</th>
                <th className="muted">User</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{fmtDateTime(ev.created_at)}</td>
                  <td>
                    <b>{niceEventLabel(ev.event_type)}</b>
                  </td>
                  <td className="score">{Number(ev.points ?? 0)}</td>
                  <td className="muted">{ev.user_id ? ev.user_id : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* AZIONI */}
      <div className="card soft" style={{ marginTop: 14 }}>
        <div className="softRow">
          <div>
            <div className="softTitle">Vuoi far crescere lo Spot?</div>
            <div className="softText">Invita gli Esploratori a scansionare il QR sulla tua pagina pubblica.</div>
          </div>
          {publicHref ? (
            <Link className="btn primary" href={publicHref} target="_blank">
              Apri pagina pubblica →
            </Link>
          ) : (
            <span className="muted">Imposta uno slug per avere la pagina pubblica.</span>
          )}
        </div>
      </div>
    </div>
  );
}