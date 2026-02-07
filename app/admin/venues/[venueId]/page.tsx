import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Kpi = {
  scans_today: number;
  votes_today: number;
  scans_7d: number;
  votes_7d: number;
  scans_live_10m: number;
};

type PromoRow = {
  id: string;
  title: string;
  description: string | null;
  promo_type: string | null;
  is_active: boolean;
  created_at: string;
};

function mustStr(fd: FormData, key: string) {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) throw new Error(`missing_${key}`);
  return v;
}

async function getKpisAdmin(venueId: string): Promise<Kpi> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_venue_kpis", { p_venue_id: venueId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;

  return {
    scans_today: Number(row?.scans_today ?? 0),
    votes_today: Number(row?.votes_today ?? 0),
    scans_7d: Number(row?.scans_7d ?? 0),
    votes_7d: Number(row?.votes_7d ?? 0),
    scans_live_10m: Number(row?.scans_live_10m ?? 0),
  };
}

async function getActivePromoTitleAdmin(venueId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_active_promo", { p_venue_id: venueId });
  if (error) throw new Error(error.message);
  const promo = Array.isArray(data) ? data[0] : null;
  return promo?.title ?? null;
}

/* ---------------------------
   Server Actions
---------------------------- */

async function createPromoAction(venueId: string, _prev: any, formData: FormData) {
  "use server";

  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const title = mustStr(formData, "title");
  const description = String(formData.get("description") ?? "").trim() || null;
  const promo_type = String(formData.get("promo_type") ?? "").trim() || "generic";

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("venue_promos").insert({
    venue_id: venueId,
    title,
    description,
    promo_type,
    is_active: false,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/venues/${venueId}`);
  return { ok: true };
}

async function setActivePromoAction(venueId: string, promoId: string) {
  "use server";

  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();

  // 1) spegni tutte
  const { error: offErr } = await supabase
    .from("venue_promos")
    .update({ is_active: false })
    .eq("venue_id", venueId);

  if (offErr) throw new Error(offErr.message);

  // 2) accendi quella scelta
  const { error: onErr } = await supabase
    .from("venue_promos")
    .update({ is_active: true })
    .eq("id", promoId)
    .eq("venue_id", venueId);

  if (onErr) throw new Error(onErr.message);

  revalidatePath(`/admin/venues/${venueId}`);
}

async function deactivateAllPromosAction(venueId: string) {
  "use server";

  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("venue_promos")
    .update({ is_active: false })
    .eq("venue_id", venueId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/venues/${venueId}`);
}

export default async function AdminVenuePage(props: { params: Promise<{ venueId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const { venueId } = await props.params;

  const supabase = createSupabaseAdminClient();

  // Venue
  const { data: venue, error: venueErr } = await supabase
    .from("venues")
    .select("id,name,city,owner_user_id")
    .eq("id", venueId)
    .maybeSingle();

  if (venueErr) throw new Error(venueErr.message);
  if (!venue) {
    return (
      <div className="card">
        <h1 className="h1">Venue non trovata</h1>
        <p className="muted">ID: {venueId}</p>
        <Link className="btn" href="/admin">← Admin</Link>
      </div>
    );
  }

  // KPI + promo attiva + lista promo
  const [kpis, activePromoTitle, promosRes] = await Promise.all([
    getKpisAdmin(venueId),
    getActivePromoTitleAdmin(venueId),
    supabase
      .from("venue_promos")
      .select("id,title,description,promo_type,is_active,created_at")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false }),
  ]);

  if (promosRes.error) throw new Error(promosRes.error.message);
  const promos = (promosRes.data ?? []) as PromoRow[];

  // Server Action “bound” al venueId
  const createPromoBound = createPromoAction.bind(null, venueId);

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Gestisci venue
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            <b>{venue.name}</b> • {venue.city ?? "—"} • ID: {venue.id}
          </p>
          <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
            owner_user_id: <b>{venue.owner_user_id ?? "—"}</b>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className="btn" href="/admin">
            ← Admin
          </Link>
          <span className="badge">
            <span className="dot" /> admin
          </span>
        </div>
      </div>

      {/* KPI */}
      <div className="notice" style={{ marginTop: 12 }}>
        <b>KPI</b> — Oggi: scans <b>{kpis.scans_today}</b>, voti <b>{kpis.votes_today}</b> • 7 giorni:
        scans <b>{kpis.scans_7d}</b>, voti <b>{kpis.votes_7d}</b> • Live 10m: <b>{kpis.scans_live_10m}</b>
      </div>

      {/* Promo attiva */}
      <div className="notice" style={{ marginTop: 12 }}>
        Promo attiva: <b>{activePromoTitle ?? "—"}</b>
        <form action={deactivateAllPromosAction.bind(null, venueId)} style={{ display: "inline-block", marginLeft: 10 }}>
          <button className="btn" type="submit">
            Disattiva tutte
          </button>
        </form>
      </div>

      {/* Crea promo */}
      <h2 className="h2" style={{ marginTop: 18 }}>
        Crea nuova promo
      </h2>

      <form action={createPromoBound as any} className="card" style={{ padding: 12, marginTop: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>
              Titolo
            </div>
            <input name="title" className="input" placeholder="Es: Spritz 4€ (solo oggi)" />
          </div>

          <div>
            <div className="muted" style={{ marginBottom: 6 }}>
              Tipo
            </div>
            <select name="promo_type" className="input" defaultValue="generic">
              <option value="generic">generic</option>
              <option value="drink">drink</option>
              <option value="food">food</option>
              <option value="event">event</option>
              <option value="discount">discount</option>
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Descrizione (opzionale)
            </div>
            <textarea
              name="description"
              className="input"
              rows={3}
              placeholder="Dettagli: orari, condizioni, ecc."
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
            <button className="btn" type="submit">
              Crea promo
            </button>
            <span className="muted" style={{ alignSelf: "center" }}>
              La promo non diventa attiva automaticamente: la attivi dalla lista sotto.
            </span>
          </div>
        </div>
      </form>

      {/* Lista promo */}
      <h2 className="h2" style={{ marginTop: 18 }}>
        Promo (storico)
      </h2>

      <table className="table" aria-label="Promo list">
        <thead>
          <tr>
            <th>Titolo</th>
            <th className="score">Tipo</th>
            <th className="score">Attiva</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {promos.map((p) => (
            <tr key={p.id}>
              <td>
                <b>{p.title}</b>
                <div className="muted">{p.description ?? "—"}</div>
              </td>
              <td className="score">{p.promo_type ?? "—"}</td>
              <td className="score">{p.is_active ? "si" : "no"}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <form action={setActivePromoAction.bind(null, venueId, p.id)}>
                  <button className="btn" type="submit" disabled={p.is_active}>
                    {p.is_active ? "Attiva" : "Rendi attiva"}
                  </button>
                </form>
              </td>
            </tr>
          ))}

          {promos.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted">
                Nessuna promo ancora.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* TODO area scans/QR */}
      <div className="notice" style={{ marginTop: 14 }}>
        Prossimo step: “Scans/Visite reali” (token monouso 1–2 minuti) + generazione QR per questa venue.
      </div>
    </div>
  );
}
