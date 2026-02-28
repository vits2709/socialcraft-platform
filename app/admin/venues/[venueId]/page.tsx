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

  const daysRaw = formData.getAll("days_of_week");
  const days_of_week = daysRaw.length > 0
    ? daysRaw.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
    : [0, 1, 2, 3, 4, 5, 6];

  const time_start = String(formData.get("time_start") ?? "00:00").trim() || "00:00";
  const time_end = String(formData.get("time_end") ?? "23:59").trim() || "23:59";
  const date_start = String(formData.get("date_start") ?? "").trim() || null;
  const date_end = String(formData.get("date_end") ?? "").trim() || null;
  const is_active = formData.get("is_active") === "true";

  if (time_end <= time_start) throw new Error("Orario fine deve essere dopo l'inizio");
  if (date_start && date_end && date_end < date_start) throw new Error("Data fine deve essere dopo l'inizio");
  if (days_of_week.length === 0) throw new Error("Seleziona almeno un giorno");

  const supabase = createSupabaseAdminClient();

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
    attiva:       { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  color: "#059669", label: "🟢 Attiva ora" },
    programmata:  { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  color: "#b45309", label: "🟡 Programmata" },
    disattivata:  { bg: "rgba(0,0,0,0.05)",        border: "rgba(0,0,0,0.12)",       color: "rgba(0,0,0,0.45)", label: "⚫ Disattivata" },
    scaduta:      { bg: "rgba(239,68,68,0.10)",    border: "rgba(239,68,68,0.25)",  color: "#dc2626", label: "🔴 Scaduta" },
  };
  const c = cfg[status];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 800,
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>
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
      <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 14px rgba(0,0,0,0.06)" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 900, color: "#0f172a" }}>Gestisci venue</h1>
        <div className="notice">Venue non trovata.</div>
        <Link className="btn" href="/admin/spots" style={{ marginTop: 12, display: "inline-block" }}>← Torna agli spot</Link>
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
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    outline: "none",
    fontSize: 14,
    background: "white",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700 as const,
    color: "rgba(15,23,42,0.55)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.4px",
    marginBottom: 6,
    display: "block",
  };

  const card: React.CSSProperties = {
    background: "white",
    borderRadius: 16,
    padding: "24px",
    boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.07)",
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>

      {/* ── HEADER ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{v.name}</h1>
              {v.city && (
                <span style={{ fontSize: 14, color: "rgba(15,23,42,0.45)", fontWeight: 500 }}>
                  📍 {v.city}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{
                display: "inline-block", padding: "4px 12px", borderRadius: 999,
                fontSize: 12, fontWeight: 700,
                background: v.is_active !== false ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
                color: v.is_active !== false ? "#059669" : "#dc2626",
                border: `1px solid ${v.is_active !== false ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`,
              }}>
                {v.is_active !== false ? "✅ Attivo" : "❌ Inattivo"}
              </span>
              {v.is_featured && (
                <span style={{
                  display: "inline-block", padding: "4px 12px", borderRadius: 999,
                  fontSize: 12, fontWeight: 700,
                  background: "rgba(45,27,105,0.10)", color: "#2D1B69",
                  border: "1px solid rgba(45,27,105,0.25)",
                }}>
                  🏅 Verificato
                </span>
              )}
              {activePromo && (
                <span style={{
                  display: "inline-block", padding: "4px 12px", borderRadius: 999,
                  fontSize: 12, fontWeight: 700,
                  background: "rgba(123,192,67,0.12)", color: "#3d7a0a",
                  border: "1px solid rgba(123,192,67,0.3)",
                }}>
                  🎁 {activePromo.title}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/admin/spots"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: "rgba(0,0,0,0.06)", color: "#0f172a", textDecoration: "none",
              }}
            >
              ← Spot
            </Link>
            <Link
              href={`/admin/venues/${v.id}/edit`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: "#2D1B69", color: "white", textDecoration: "none",
              }}
            >
              ✏️ Modifica info
            </Link>
            {v.slug && (
              <Link
                href={`/v/${v.slug}`}
                target="_blank"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: "rgba(123,192,67,0.15)", color: "#3d7a0a",
                  border: "1px solid rgba(123,192,67,0.3)", textDecoration: "none",
                }}
              >
                ↗ Apri pagina
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── QR CODE ── */}
      {v.slug && (
        <div style={card}>
          <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
            QR Code Check-in
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(15,23,42,0.5)" }}>
            Stampa e affiggi questo QR nello spot. Gli utenti lo scansioneranno per registrare la presenza e guadagnare punti.
          </p>
          <AdminQrDownload
            slug={v.slug}
            venueName={v.name}
            siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
          />
        </div>
      )}

      {/* ── PROMO ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
            🎁 Gestione Promo
          </h2>
          <form action={deactivateAllPromosAction}>
            <input type="hidden" name="venue_id" value={v.id} />
            <button
              type="submit"
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "rgba(239,68,68,0.09)", color: "#dc2626",
                border: "1px solid rgba(239,68,68,0.22)",
              }}
            >
              Disattiva tutte
            </button>
          </form>
        </div>

        {/* Lista promo esistenti */}
        {promosWithStatus.length === 0 ? (
          <div style={{
            padding: "24px", textAlign: "center", borderRadius: 12,
            background: "rgba(0,0,0,0.03)", color: "rgba(15,23,42,0.4)", fontSize: 14,
            marginBottom: 24,
          }}>
            Nessuna promo ancora. Creane una qui sotto!
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
            {promosWithStatus.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.07)",
                  background: "rgba(248,249,250,0.7)",
                  borderLeft: `4px solid ${
                    p.status === "attiva"      ? "#059669" :
                    p.status === "programmata" ? "#f59e0b" :
                    p.status === "scaduta"     ? "#dc2626" :
                    "rgba(0,0,0,0.10)"
                  }`,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>{p.title}</div>
                    {p.description && (
                      <div style={{ fontSize: 13, color: "rgba(15,23,42,0.55)", marginTop: 2 }}>{p.description}</div>
                    )}
                  </div>
                  {statusBadge(p.status)}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
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

                <form action={togglePromoAction}>
                  <input type="hidden" name="promo_id" value={p.id} />
                  <input type="hidden" name="venue_id" value={v.id} />
                  <input type="hidden" name="new_active" value={p.is_active ? "false" : "true"} />
                  <button
                    type="submit"
                    style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: p.is_active ? "rgba(239,68,68,0.09)" : "rgba(16,185,129,0.12)",
                      color: p.is_active ? "#dc2626" : "#059669",
                      border: `1px solid ${p.is_active ? "rgba(239,68,68,0.22)" : "rgba(16,185,129,0.3)"}`,
                    }}
                  >
                    {p.is_active ? "⏸ Disattiva" : "▶️ Attiva"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "4px 0 20px" }} />

        {/* Form crea promo */}
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 900, color: "#0f172a" }}>
          + Crea nuova promo
        </h3>

        <form
          action={createPromoAction}
          style={{
            background: "rgba(45,27,105,0.04)",
            border: "1px solid rgba(45,27,105,0.10)",
            borderRadius: 14,
            padding: "20px",
            display: "grid",
            gap: 16,
          }}
        >
          <input type="hidden" name="venue_id" value={v.id} />

          {/* Titolo + Tipo */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Titolo *</label>
              <input name="title" placeholder="Es: Happy Hour 18-21" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select name="promo_type" defaultValue="generic" style={inputStyle}>
                <option value="generic">Generico</option>
                <option value="drink">Drink</option>
                <option value="food">Food</option>
                <option value="event">Evento</option>
                <option value="discount">Sconto</option>
              </select>
            </div>
          </div>

          {/* Tipo bonus + Valore */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo bonus</label>
              <select name="bonus_type" defaultValue="points" style={inputStyle}>
                <option value="points">Punti extra (aggiuntivi)</option>
                <option value="multiplier">Moltiplicatore (x2, x3…)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Valore bonus *</label>
              <input
                name="bonus_value"
                type="number"
                min={0}
                max={100}
                step={0.5}
                defaultValue={2}
                placeholder="Es: 3 o 2x"
                style={inputStyle}
                required
              />
              <div style={{ fontSize: 11, color: "rgba(15,23,42,0.45)", marginTop: 4 }}>
                Punti extra: +N pt · Moltiplicatore: max 5x
              </div>
            </div>
          </div>

          {/* Giorni */}
          <div>
            <label style={labelStyle}>Giorni attivi *</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {GIORNI.map((g) => (
                <label
                  key={g.val}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "7px 13px", borderRadius: 9,
                    border: "1px solid rgba(45,27,105,0.15)",
                    background: "white",
                    cursor: "pointer", fontSize: 13, fontWeight: 700,
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

          {/* Orario */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Ora inizio</label>
              <input name="time_start" type="time" defaultValue="18:00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ora fine</label>
              <input name="time_end" type="time" defaultValue="21:00" style={inputStyle} />
            </div>
          </div>

          {/* Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Data inizio (opzionale)</label>
              <input name="date_start" type="date" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Data fine (opzionale)</label>
              <input name="date_end" type="date" style={inputStyle} />
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <label style={labelStyle}>Descrizione (opzionale)</label>
            <textarea
              name="description"
              placeholder="Es: Aperitivo con stuzzichini inclusi. Mostra questo screen alla cassa."
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Attiva subito */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
            <button
              type="submit"
              style={{
                padding: "13px 32px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 900,
                cursor: "pointer",
                background: "linear-gradient(135deg, #2D1B69 0%, #7bc043 100%)",
                color: "white",
                border: "none",
                boxShadow: "0 4px 16px rgba(45,27,105,0.28)",
                letterSpacing: "0.2px",
              }}
            >
              Crea promo
            </button>
          </div>
        </form>

        {pErr && (
          <div className="notice" style={{ marginTop: 12 }}>Errore promos: {pErr.message}</div>
        )}
      </div>

      {/* ── INFO TECNICHE (collassabile) ── */}
      <details style={{
        background: "white",
        borderRadius: 16,
        boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}>
        <summary style={{
          padding: "16px 24px",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          color: "rgba(15,23,42,0.45)",
          userSelect: "none",
        }}>
          🔧 Info tecniche
        </summary>
        <div style={{ padding: "4px 24px 20px", display: "grid", gap: 10, fontSize: 13 }}>
          {[
            { label: "ID", value: v.id },
            { label: "Slug", value: v.slug ?? "—" },
            { label: "Owner ID", value: v.owner_user_id ?? "—" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: "rgba(15,23,42,0.5)", minWidth: 70 }}>{row.label}</span>
              <code style={{
                fontFamily: "monospace",
                fontSize: 12,
                background: "rgba(0,0,0,0.05)",
                padding: "3px 10px",
                borderRadius: 6,
                color: "#2D1B69",
                wordBreak: "break-all",
              }}>
                {row.value}
              </code>
            </div>
          ))}
        </div>
      </details>

    </div>
  );
}
