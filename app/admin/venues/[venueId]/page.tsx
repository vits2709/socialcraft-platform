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

/* ---------------------------
   DATA LOADERS
---------------------------- */

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
  if (error) return null;
  const promo = Array.isArray(data) ? data[0] : null;
  return promo?.title ?? null;
}

/* ---------------------------
   SERVER ACTIONS
---------------------------- */

async function createPromoAction(venueId: string, formData: FormData) {
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
}

async function setActivePromoAction(venueId: string, promoId: string) {
  "use server";

  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();

  // spegni tutte
  await supabase
    .from("venue_promos")
    .update({ is_active: false })
    .eq("venue_id", venueId);

  // attiva scelta
  await supabase
    .from("venue_promos")
    .update({ is_active: true })
    .eq("id", promoId)
    .eq("venue_id", venueId);

  revalidatePath(`/admin/venues/${venueId}`);
}

async function deactivateAllPromosAction(venueId: string) {
  "use server";

  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();
  await supabase
    .from("venue_promos")
    .update({ is_active: false })
    .eq("venue_id", venueId);

  revalidatePath(`/admin/venues/${venueId}`);
}

async function deletePromoAction(venueId: string, promoId: string) {
  "use server";

  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();

  await supabase
    .from("venue_promos")
    .delete()
    .eq("id", promoId)
    .eq("venue_id", venueId);

  revalidatePath(`/admin/venues/${venueId}`);
}

/* ---------------------------
   PAGE
---------------------------- */

export default async function AdminVenuePage(props: { params: Promise<{ venueId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const { venueId } = await props.params;
  const supabase = createSupabaseAdminClient();

  const { data: venue } = await supabase
    .from("venues")
    .select("id,name,city,owner_user_id")
    .eq("id", venueId)
    .maybeSingle();

  if (!venue) {
    return (
      <div className="card">
        <h1 className="h1">Venue non trovata</h1>
        <p>ID: {venueId}</p>
        <Link className="btn" href="/admin">← Admin</Link>
      </div>
    );
  }

  const [kpis, activePromoTitle, promosRes] = await Promise.all([
    getKpisAdmin(venueId),
    getActivePromoTitleAdmin(venueId),
    supabase
      .from("venue_promos")
      .select("*")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false }),
  ]);

  const promos = (promosRes.data ?? []) as PromoRow[];
  const createPromoBound = createPromoAction.bind(null, venueId);

  return (
    <div className="card">

      <h1 className="h1">Gestisci venue</h1>

      <div className="notice">
        <b>{venue.name}</b> — {venue.city ?? "—"}  
        <br />ID: {venue.id}
      </div>

      <div className="notice" style={{ marginTop: 10 }}>
        KPI: scans oggi {kpis.scans_today} • voti oggi {kpis.votes_today} • live {kpis.scans_live_10m}
      </div>

      <div className="notice" style={{ marginTop: 10 }}>
        Promo attiva: <b>{activePromoTitle ?? "—"}</b>

        <form action={deactivateAllPromosAction.bind(null, venueId)} style={{ display: "inline-block", marginLeft: 10 }}>
          <button className="btn" type="submit">Disattiva tutte</button>
        </form>
      </div>

      <h2 className="h2" style={{ marginTop: 18 }}>Crea nuova promo</h2>

      <form action={createPromoBound} className="card" style={{ padding: 12, marginTop: 8 }}>
        <input name="title" className="input" placeholder="Titolo promo" />
        <textarea name="description" className="input" placeholder="Descrizione" />
        <select name="promo_type" className="input">
          <option value="generic">generic</option>
          <option value="drink">drink</option>
          <option value="food">food</option>
        </select>
        <button className="btn" type="submit">Crea promo</button>
      </form>

      <h2 className="h2" style={{ marginTop: 18 }}>Promo</h2>

      <table className="table">
        <tbody>
          {promos.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td>{p.is_active ? "Attiva" : "No"}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <form action={setActivePromoAction.bind(null, venueId, p.id)}>
                  <button className="btn" type="submit">Attiva</button>
                </form>

                <form action={deletePromoAction.bind(null, venueId, p.id)}>
                  <button className="btn" type="submit">Elimina</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20 }}>
        <Link className="btn" href="/admin">← Torna Admin</Link>
      </div>

    </div>
  );
}