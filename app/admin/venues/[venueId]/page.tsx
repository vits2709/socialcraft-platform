import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import AdminQrDownload from "@/components/AdminQrDownload";

export const runtime = "nodejs";

type VenueRow = {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
  owner_user_id: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
};

type PromoRow = {
  id: string;
  venue_id: string;
  title: string;
  description: string | null;
  promo_type: string;
  is_active: boolean;
  created_at: string;
};

function mustStr(fd: FormData, key: string) {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) throw new Error(`missing_${key}`);
  return v;
}

/**
 * ✅ SERVER ACTION CORRETTA
 * - deve ricevere FormData
 * - deve essere usata così: <form action={createPromoAction}>...</form>
 */
async function createPromoAction(formData: FormData) {
  "use server";

  const venueId = String(formData.get("venue_id") ?? "").trim();
  if (!venueId) throw new Error("missing_venue_id");

  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const title = mustStr(formData, "title");
  const promo_type = mustStr(formData, "promo_type");
  const description = String(formData.get("description") ?? "").trim() || null;

  const supabase = createSupabaseAdminClient();

  // 1) disattiva eventuali promo attive della venue (regola: una attiva)
  const { error: offErr } = await supabase
    .from("venue_promos")
    .update({ is_active: false })
    .eq("venue_id", venueId)
    .eq("is_active", true);

  if (offErr) throw new Error(offErr.message);

  // 2) crea promo attiva
  const { error: insErr } = await supabase.from("venue_promos").insert({
    venue_id: venueId,
    title,
    description,
    promo_type,
    is_active: true,
  });

  if (insErr) throw new Error(insErr.message);

  revalidatePath(`/admin/venues/${venueId}`);
  // niente redirect obbligatorio: ricarica pagina server-side
}

async function deactivateAllPromosAction(formData: FormData) {
  "use server";

  const venueId = String(formData.get("venue_id") ?? "").trim();
  if (!venueId) throw new Error("missing_venue_id");

  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("venue_promos").update({ is_active: false }).eq("venue_id", venueId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/venues/${venueId}`);
}

export default async function AdminVenuePage(props: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await props.params;

  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const supabaseRO = await createSupabaseServerClientReadOnly();

  const { data: venue, error: vErr } = await supabaseRO
    .from("venues")
    .select("id,name,city,slug,owner_user_id,is_active,is_featured")
    .eq("id", venueId)
    .maybeSingle();

  if (vErr || !venue) {
    return (
      <div className="card">
        <h1 className="h1">Gestisci venue</h1>
        <div className="notice">Venue non trovata.</div>
        <Link className="btn" href="/admin">
          ← Admin
        </Link>
      </div>
    );
  }

  const v = venue as VenueRow;

  const { data: promos, error: pErr } = await supabaseRO
    .from("venue_promos")
    .select("id,venue_id,title,description,promo_type,is_active,created_at")
    .eq("venue_id", v.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const activePromo = (promos ?? []).find((x: PromoRow) => x.is_active) ?? null;

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Gestisci venue
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            <b>{v.name}</b> • {v.city ?? "—"} • ID: {v.id}
          </p>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            owner_user_id: {v.owner_user_id ?? "—"} <br />
            slug: {v.slug ?? "—"}
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span
              className="badge"
              style={{
                background: v.is_active !== false ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
                borderColor: v.is_active !== false ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)",
                color: v.is_active !== false ? "#059669" : "#dc2626",
              }}
            >
              {v.is_active !== false ? "✅ Attivo" : "❌ Disattivo"}
            </span>
            {v.is_featured && (
              <span className="badge" style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.3)", color: "#6366f1" }}>
                🏅 Verificato
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link className="btn" href="/admin">
            ← Admin
          </Link>
          <Link className="btn" href={`/admin/venues/${v.id}/edit`}>
            ✏️ Modifica info spot
          </Link>
          {v.slug ? (
            <Link className="btn" href={`/v/${v.slug}`} target="_blank">
              Apri pagina venue
            </Link>
          ) : null}
        </div>
      </div>

      {/* QR CODE CHECK-IN */}
      {v.slug && (
        <section style={{ marginTop: 16 }}>
          <h2 className="h2" style={{ marginBottom: 10 }}>
            QR Code Check-in
          </h2>
          <div className="notice" style={{ padding: 20 }}>
            <p className="muted" style={{ marginTop: 0, marginBottom: 16, fontSize: 13 }}>
              Stampa e affiggi questo QR nello spot. Gli utenti lo scansioneranno per registrare la presenza e guadagnare punti.
            </p>
            <AdminQrDownload
              slug={v.slug}
              venueName={v.name}
              siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
            />
          </div>
        </section>
      )}

      {/* PROMO ATTIVA */}
      <div className="notice" style={{ marginTop: 12 }}>
        Promo attiva: <b>{activePromo ? activePromo.title : "—"}</b>
        <div style={{ marginTop: 8 }}>
          <form action={deactivateAllPromosAction}>
            <input type="hidden" name="venue_id" value={v.id} />
            <button className="btn" type="submit">
              Disattiva tutte
            </button>
          </form>
        </div>
      </div>

      {/* CREA PROMO */}
      <section style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>
          Crea nuova promo
        </h2>

        <form action={createPromoAction} className="card" style={{ padding: 14 }}>
          {/* ✅ QUESTO HIDDEN È FONDAMENTALE */}
          <input type="hidden" name="venue_id" value={v.id} />

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>
                Titolo
              </div>
              <input
                name="title"
                placeholder="Es: Spritz 4€ (solo oggi)"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <div className="muted" style={{ marginBottom: 6 }}>
                Tipo
              </div>
              <select
                name="promo_type"
                defaultValue="generic"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  outline: "none",
                }}
              >
                <option value="generic">generic</option>
                <option value="drink">drink</option>
                <option value="food">food</option>
                <option value="event">event</option>
                <option value="discount">discount</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Descrizione (opzionale)
            </div>
            <textarea
              name="description"
              placeholder="Es: Valido dalle 18 alle 21. Mostra questo screen."
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn" type="submit">
              Crea promo (attiva)
            </button>
          </div>
        </form>

        {pErr ? <div className="notice">Errore promos: {pErr.message}</div> : null}
      </section>

      {/* LISTA PROMO */}
      <section style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>
          Ultime promo
        </h2>

        {(promos ?? []).length === 0 ? (
          <div className="notice">Nessuna promo.</div>
        ) : (
          <table className="table" aria-label="Promo list">
            <thead>
              <tr>
                <th>Titolo</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th style={{ textAlign: "right" }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {(promos ?? []).map((p: PromoRow) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.title}</b>
                    {p.description ? <div className="muted">{p.description}</div> : null}
                  </td>
                  <td className="muted">{p.promo_type}</td>
                  <td>{p.is_active ? <span className="badge">ATTIVA</span> : <span className="muted">—</span>}</td>
                  <td style={{ textAlign: "right" }} className="muted">
                    {new Date(p.created_at).toLocaleString("it-IT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}