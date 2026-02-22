import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import AdminQrDownload from "@/components/AdminQrDownload";
import { isPromoActiveNow, promoStatusLabel, type PromoSchedule } from "@/lib/promo-utils";

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
  bonus_type: string;
  bonus_value: number;
  days_of_week: number[];
  time_start: string;
  time_end: string;
  date_start: string | null;
  date_end: string | null;
  created_at: string;
};

function mustStr(fd: FormData, key: string) {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) throw new Error(`missing_${key}`);
  return v;
}

const GIORNI = [
  { val: 1, label: "Lun" },
  { val: 2, label: "Mar" },
  { val: 3, label: "Mer" },
  { val: 4, label: "Gio" },
  { val: 5, label: "Ven" },
  { val: 6, label: "Sab" },
  { val: 0, label: "Dom" },
];

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
  const bonus_type = String(formData.get("bonus_type") ?? "points") === "multiplier" ? "multiplier" : "points";
  const bonus_value_raw = Number(formData.get("bonus_value") ?? 0);
  const bonus_value = bonus_type === "multiplier"
    ? Math.min(5, Math.max(0, bonus_value_raw))
    : Math.max(0, bonus_value_raw);

  // Giorni della settimana: formData.getAll restituisce array di stringhe
  const daysRaw = formData.getAll("days_of_week");
  const days_of_week = daysRaw.length > 0
    ? daysRaw.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
    : [0, 1, 2, 3, 4, 5, 6];

  const time_start = String(formData.get("time_start") ?? "00:00").trim() || "00:00";
  const time_end = String(formData.get("time_end") ?? "23:59").trim() || "23:59";
  const date_start = String(formData.get("date_start") ?? "").trim() || null;
  const date_end = String(formData.get("date_end") ?? "").trim() || null;
  const is_active = formData.get("is_active") === "true";

  // Validazioni
  if (time_end <= time_start) throw new Error("Orario fine deve essere dopo l'inizio");
  if (date_start && date_end && date_end < date_start) throw new Error("Data fine deve essere dopo l'inizio");
  if (days_of_week.length === 0) throw new Error("Seleziona almeno un giorno");

  const supabase = createSupabaseAdminClient();

  // Se la nuova promo è attiva, disattiva le altre (regola: una attiva)
  if (is_active) {
    await supabase
      .from("venue_promos")
      .update({ is_active: false })
      .eq("venue_id", venueId)
      .eq("is_active", true);
  }

  const { error: insErr } = await supabase.from("venue_promos").insert({
    venue_id: venueId,
    title,
    description,
    promo_type,
    is_active,
    bonus_type,
    bonus_value,
    days_of_week,
    time_start,
    time_end,
    date_start,
    date_end,
  });

  if (insErr) throw new Error(insErr.message);

  revalidatePath(`/admin/venues/${venueId}`);
}

async function togglePromoAction(formData: FormData) {
  "use server";

  const promoId = String(formData.get("promo_id") ?? "").trim();
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const newActive = formData.get("new_active") === "true";

  if (!promoId || !venueId) throw new Error("missing_ids");

  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const supabase = createSupabaseAdminClient();

  // Se attivazione: disattiva le altre prima
  if (newActive) {
    await supabase
      .from("venue_promos")
      .update({ is_active: false })
      .eq("venue_id", venueId)
      .eq("is_active", true);
  }

  const { error } = await supabase
    .from("venue_promos")
    .update({ is_active: newActive })
    .eq("id", promoId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/venues/${venueId}`);
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

function statusBadge(status: ReturnType<typeof promoStatusLabel>) {
  const cfg = {
    attiva: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#059669", label: "🟢 Attiva ora" },
    programmata: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "#b45309", label: "🟡 Programmata" },
    disattivata: { bg: "rgba(0,0,0,0.05)", border: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.45)", label: "⚫ Disattivata" },
    scaduta: { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.25)", color: "#dc2626", label: "🔴 Scaduta" },
  };
  const c = cfg[status];
  return (
    <span
      className="badge"
      style={{ background: c.bg, borderColor: c.border, color: c.color, fontWeight: 900 }}
    >
      {c.label}
    </span>
  );
}

function fmtDays(days: number[]): string {
  if (!days || days.length === 7) return "Tutti i giorni";
  return days
    .slice()
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => GIORNI.find((g) => g.val === d)?.label ?? d)
    .join(", ");
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
        <Link className="btn" href="/admin">← Admin</Link>
      </div>
    );
  }

  const v = venue as VenueRow;

  const { data: promos, error: pErr } = await supabaseRO
    .from("venue_promos")
    .select("id,venue_id,title,description,promo_type,is_active,bonus_type,bonus_value,days_of_week,time_start,time_end,date_start,date_end,created_at")
    .eq("venue_id", v.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const activePromo = (promos ?? []).find((x: PromoRow) => x.is_active) ?? null;

  // Calcola status per ogni promo
  const promosWithStatus = (promos ?? []).map((p: PromoRow) => ({
    ...p,
    status: promoStatusLabel({
      ...p,
      bonus_type: (p.bonus_type ?? "points") as "points" | "multiplier",
      days_of_week: Array.isArray(p.days_of_week) ? p.days_of_week : [0,1,2,3,4,5,6],
    } as PromoSchedule & { date_end: string | null }),
  }));

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    outline: "none",
    fontSize: 14,
    background: "rgba(255,255,255,0.9)",
    boxSizing: "border-box" as const,
  };

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>Gestisci venue</h1>
          <p className="muted" style={{ margin: 0 }}>
            <b>{v.name}</b> • {v.city ?? "—"} • ID: {v.id}
          </p>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            owner_user_id: {v.owner_user_id ?? "—"} <br />
            slug: {v.slug ?? "—"}
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span className="badge" style={{
              background: v.is_active !== false ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
              borderColor: v.is_active !== false ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)",
              color: v.is_active !== false ? "#059669" : "#dc2626",
            }}>
              {v.is_active !== false ? "✅ Attivo" : "❌ Disattivo"}
            </span>
            {v.is_featured && (
              <span className="badge" style={{ background: "rgba(45,27,105,0.1)", borderColor: "rgba(45,27,105,0.3)", color: "#2D1B69" }}>
                🏅 Verificato
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link className="btn" href="/admin">← Admin</Link>
          <Link className="btn" href={`/admin/venues/${v.id}/edit`}>✏️ Modifica info spot</Link>
          {v.slug && (
            <Link className="btn" href={`/v/${v.slug}`} target="_blank">Apri pagina venue</Link>
          )}
        </div>
      </div>

      {/* QR CODE CHECK-IN */}
      {v.slug && (
        <section style={{ marginTop: 16 }}>
          <h2 className="h2" style={{ marginBottom: 10 }}>QR Code Check-in</h2>
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
        {activePromo && isPromoActiveNow({
          ...activePromo,
          bonus_type: (activePromo.bonus_type ?? "points") as "points" | "multiplier",
          days_of_week: Array.isArray(activePromo.days_of_week) ? activePromo.days_of_week : [0,1,2,3,4,5,6],
        } as PromoSchedule) && (
          <span style={{ marginLeft: 8, fontSize: 12, color: "#059669", fontWeight: 800 }}>🟢 Attiva ora</span>
        )}
        <div style={{ marginTop: 8 }}>
          <form action={deactivateAllPromosAction}>
            <input type="hidden" name="venue_id" value={v.id} />
            <button className="btn" type="submit">Disattiva tutte</button>
          </form>
        </div>
      </div>

      {/* CREA NUOVA PROMO */}
      <section style={{ marginTop: 14 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>Crea nuova promo</h2>

        <form action={createPromoAction} className="card" style={{ padding: 16, display: "grid", gap: 14 }}>
          <input type="hidden" name="venue_id" value={v.id} />

          {/* Riga 1: Titolo + Tipo */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Titolo *</div>
              <input name="title" placeholder="Es: Happy Hour 18-21" style={inputStyle} required />
            </div>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Tipo</div>
              <select name="promo_type" defaultValue="generic" style={inputStyle}>
                <option value="generic">Generico</option>
                <option value="drink">Drink</option>
                <option value="food">Food</option>
                <option value="event">Evento</option>
                <option value="discount">Sconto</option>
              </select>
            </div>
          </div>

          {/* Riga 2: Tipo bonus + Valore */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Tipo bonus</div>
              <select name="bonus_type" defaultValue="points" style={inputStyle}>
                <option value="points">Punti extra (aggiuntivi)</option>
                <option value="multiplier">Moltiplicatore (x2, x3…)</option>
              </select>
            </div>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Valore bonus *</div>
              <input
                name="bonus_value"
                type="number"
                min={0}
                max={100}
                step={0.5}
                defaultValue={2}
                placeholder="Es: 3 (punti) oppure 2 (x2)"
                style={inputStyle}
                required
              />
              <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
                Punti extra: +N pt · Moltiplicatore: max 5x
              </div>
            </div>
          </div>

          {/* Riga 3: Giorni della settimana */}
          <div>
            <div className="muted" style={{ marginBottom: 8 }}>Giorni attivi *</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {GIORNI.map((g) => (
                <label
                  key={g.val}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(255,255,255,0.8)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    name="days_of_week"
                    value={g.val}
                    defaultChecked
                    style={{ accentColor: "#2D1B69" }}
                  />
                  {g.label}
                </label>
              ))}
            </div>
          </div>

          {/* Riga 4: Orario */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Ora inizio</div>
              <input name="time_start" type="time" defaultValue="18:00" style={inputStyle} />
            </div>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Ora fine</div>
              <input name="time_end" type="time" defaultValue="21:00" style={inputStyle} />
            </div>
          </div>

          {/* Riga 5: Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Data inizio (opzionale)</div>
              <input name="date_start" type="date" style={inputStyle} />
            </div>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Data fine (opzionale)</div>
              <input name="date_end" type="date" style={inputStyle} />
            </div>
          </div>

          {/* Riga 6: Descrizione */}
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>Descrizione (opzionale)</div>
            <textarea
              name="description"
              placeholder="Es: Aperitivo con stuzzichini inclusi. Mostra questo screen alla cassa."
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Riga 7: Attiva subito */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              <input type="radio" name="is_active" value="true" defaultChecked style={{ accentColor: "#059669" }} />
              ✅ Attiva subito
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              <input type="radio" name="is_active" value="false" style={{ accentColor: "#2D1B69" }} />
              🔵 Salva come bozza
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn" type="submit" style={{ fontWeight: 900 }}>
              Crea promo
            </button>
          </div>
        </form>

        {pErr ? <div className="notice">Errore promos: {pErr.message}</div> : null}
      </section>

      {/* LISTA PROMO */}
      <section style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>Promo ({promosWithStatus.length})</h2>

        {promosWithStatus.length === 0 ? (
          <div className="notice">Nessuna promo ancora.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {promosWithStatus.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: 14,
                  display: "grid",
                  gap: 8,
                  borderLeft: p.status === "attiva"
                    ? "3px solid #059669"
                    : p.status === "programmata"
                    ? "3px solid #f59e0b"
                    : p.status === "scaduta"
                    ? "3px solid #dc2626"
                    : "3px solid rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{p.title}</div>
                    {p.description && <div className="muted" style={{ fontSize: 13 }}>{p.description}</div>}
                  </div>
                  {statusBadge(p.status)}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }} className="muted">
                  <span>
                    {p.bonus_type === "multiplier"
                      ? `🔥 x${p.bonus_value} punti`
                      : `🔥 +${p.bonus_value} pt bonus`}
                  </span>
                  <span>·</span>
                  <span>⏰ {(p.time_start ?? "00:00").slice(0, 5)}–{(p.time_end ?? "23:59").slice(0, 5)}</span>
                  <span>·</span>
                  <span>📅 {fmtDays(Array.isArray(p.days_of_week) ? p.days_of_week : [])}</span>
                  {p.date_start && <><span>·</span><span>Dal {p.date_start}</span></>}
                  {p.date_end && <><span>·</span><span>Al {p.date_end}</span></>}
                </div>

                {/* Toggle attiva/disattiva */}
                <div>
                  <form action={togglePromoAction}>
                    <input type="hidden" name="promo_id" value={p.id} />
                    <input type="hidden" name="venue_id" value={v.id} />
                    <input type="hidden" name="new_active" value={p.is_active ? "false" : "true"} />
                    <button className="btn" type="submit" style={{ fontSize: 12, padding: "6px 12px" }}>
                      {p.is_active ? "⏸ Disattiva" : "▶️ Attiva"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
