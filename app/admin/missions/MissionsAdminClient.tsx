"use client";

import { useState, useMemo } from "react";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type MissionType =
  | "checkin" | "checkin_receipt" | "checkin_receipt_amount"
  | "checkin_category" | "checkin_spot" | "checkin_timeslot"
  | "checkin_companion" | "vote" | "first_visit"
  | "checkin_weekday" | "checkin_multiple";

type MissionRow = {
  id: string;
  type: "daily" | "weekly";
  title: string;
  description: string;
  emoji: string;
  completion_message: string | null;
  mission_type: MissionType;
  config: Record<string, unknown>;
  points_reward: number;
  max_completions: number | null;
  is_surprise: boolean;
  is_active: boolean;
  active_from: string;
  active_until: string;
  created_at: string;
  completions_count: number;
};

type VenueOption = { id: string; name: string };
type MissionStatus = "template" | "programmed" | "active" | "expired";

// ─── Costanti ────────────────────────────────────────────────────────────────

const MISSION_TYPE_LABELS: Record<string, string> = {
  checkin: "Check-in",
  checkin_receipt: "Check-in + Scontrino",
  checkin_receipt_amount: "Scontrino importo minimo",
  checkin_category: "Check-in categoria",
  checkin_spot: "Check-in spot specifico",
  checkin_timeslot: "Check-in fascia oraria",
  checkin_companion: "Check-in in compagnia",
  vote: "Voto",
  first_visit: "Prima visita",
  checkin_weekday: "Check-in giorno specifico",
  checkin_multiple: "Check-in multipli",
};

const STATUS_CFG: Record<MissionStatus, { label: string; color: string; bg: string }> = {
  template:   { label: "Template",   color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  programmed: { label: "Programmata",color: "#2563eb", bg: "rgba(37,99,235,0.1)"  },
  active:     { label: "Attiva",     color: "#059669", bg: "rgba(5,150,105,0.1)"  },
  expired:    { label: "Scaduta",    color: "#dc2626", bg: "rgba(220,38,38,0.1)"  },
};

const CATEGORIES = ["bar", "ristorante", "barber", "parrucchiere", "estetica", "palestra"];
const WEEKDAYS   = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const WEEK_DAYS_ORDER = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMissionStatus(m: MissionRow): MissionStatus {
  if (!m.is_active) return "template";
  const now = new Date();
  const until = new Date(m.active_until);
  const from  = new Date(m.active_from);
  if (until < now) return "expired";
  if (from  > now) return "programmed";
  return "active";
}

function fmtDatetime(iso: string) {
  if (!iso || iso.startsWith("2000-")) return "—";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function toLocalDatetimeInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISO(localDt: string) {
  if (!localDt) return "";
  return new Date(localDt).toISOString();
}

function nextMondayAt(hour: number, min = 0) {
  const d = new Date();
  const day = d.getDay(); // 0=Dom
  const daysToMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysToMonday);
  d.setHours(hour, min, 0, 0);
  return d;
}

function buildConfigSummary(m: MissionRow): string {
  const c = m.config ?? {};
  switch (m.mission_type) {
    case "checkin_receipt_amount": return `min €${c.min_amount ?? "?"}`;
    case "checkin_category":       return String(c.category ?? c.different_categories ? `${c.different_categories} categorie diverse` : "?");
    case "checkin_spot":           return `spot specifico`;
    case "checkin_timeslot":       return `${c.time_start ?? "?"}–${c.time_end ?? "?"}`;
    case "checkin_companion":      return `min ${c.min_companions ?? 1} compagno${(c.count && Number(c.count) > 1) ? ` × ${c.count}` : ""}`;
    case "checkin_multiple":       return `${c.count ?? "?"} spot${c.different_days ? " giorni diversi" : ""}`;
    case "checkin_weekday":        return WEEKDAYS[Number(c.weekday ?? 0)] ?? "?";
    default: return "";
  }
}

// ─── FormState ────────────────────────────────────────────────────────────────

type FormState = {
  type: "daily" | "weekly";
  emoji: string;
  title: string;
  description: string;
  completion_message: string;
  mission_type: MissionType;
  points_reward: number;
  is_surprise: boolean;
  max_completions: string;
  // config dinamico
  cfg_min_amount: string;
  cfg_category: string;
  cfg_spot_id: string;
  cfg_time_start: string;
  cfg_time_end: string;
  cfg_min_companions: string;
  cfg_count: string;
  cfg_weekday: string;
  // date (opzionali — se vuote → template)
  active_from: string;
  active_until: string;
};

const EMPTY_FORM: FormState = {
  type: "daily", emoji: "🎯", title: "", description: "",
  completion_message: "", mission_type: "checkin",
  points_reward: 5, is_surprise: false, max_completions: "",
  cfg_min_amount: "", cfg_category: "", cfg_spot_id: "",
  cfg_time_start: "", cfg_time_end: "",
  cfg_min_companions: "", cfg_count: "", cfg_weekday: "",
  active_from: "", active_until: "",
};

function missionToForm(m: MissionRow): FormState {
  const c = m.config ?? {};
  return {
    type: m.type,
    emoji: m.emoji,
    title: m.title,
    description: m.description,
    completion_message: m.completion_message ?? "",
    mission_type: m.mission_type,
    points_reward: m.points_reward,
    is_surprise: m.is_surprise,
    max_completions: m.max_completions !== null ? String(m.max_completions) : "",
    cfg_min_amount:    String(c.min_amount    ?? ""),
    cfg_category:      String(c.category      ?? ""),
    cfg_spot_id:       String(c.spot_id       ?? ""),
    cfg_time_start:    String(c.time_start    ?? ""),
    cfg_time_end:      String(c.time_end      ?? ""),
    cfg_min_companions:String(c.min_companions ?? ""),
    cfg_count:         String(c.count         ?? ""),
    cfg_weekday:       c.weekday !== undefined ? String(c.weekday) : "",
    active_from: "",
    active_until: "",
  };
}

function formToPayload(f: FormState, isScheduled: boolean) {
  const config: Record<string, unknown> = {};
  if (f.mission_type === "checkin_receipt_amount" && f.cfg_min_amount)
    config.min_amount = Number(f.cfg_min_amount);
  if (f.mission_type === "checkin_category"       && f.cfg_category)
    config.category = f.cfg_category;
  if (f.mission_type === "checkin_spot"           && f.cfg_spot_id)
    config.spot_id = f.cfg_spot_id;
  if (f.mission_type === "checkin_timeslot") {
    if (f.cfg_time_start) config.time_start = f.cfg_time_start;
    if (f.cfg_time_end)   config.time_end   = f.cfg_time_end;
  }
  if (f.mission_type === "checkin_companion"      && f.cfg_min_companions)
    config.min_companions = Number(f.cfg_min_companions);
  if (f.mission_type === "checkin_multiple"       && f.cfg_count)
    config.count = Number(f.cfg_count);
  if (f.mission_type === "checkin_weekday"        && f.cfg_weekday !== "")
    config.weekday = Number(f.cfg_weekday);

  const fromISO  = isScheduled && f.active_from  ? toISO(f.active_from)  : "2000-01-01T00:00:00+00";
  const untilISO = isScheduled && f.active_until ? toISO(f.active_until) : "2000-01-01T00:00:00+00";

  return {
    type: f.type,
    emoji: f.emoji || "🎯",
    title: f.title.trim(),
    description: f.description.trim(),
    completion_message: f.completion_message.trim() || null,
    mission_type: f.mission_type,
    config,
    points_reward: Number(f.points_reward),
    is_surprise: f.is_surprise,
    max_completions: f.max_completions ? Number(f.max_completions) : null,
    is_active: isScheduled,
    active_from:  fromISO,
    active_until: untilISO,
  };
}

// ─── Input helpers ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
  fontSize: 14,
  fontWeight: 600,
  background: "rgba(255,255,255,0.9)",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  opacity: 0.6,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 4,
  display: "block",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Modal overlay ────────────────────────────────────────────────────────────

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 20, padding: 24,
          width: "100%", maxWidth: 540, maxHeight: "90vh",
          overflowY: "auto", display: "grid", gap: 16,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── ScheduleModal ────────────────────────────────────────────────────────────

function ScheduleModal({
  mission,
  onClose,
  onScheduled,
}: {
  mission: MissionRow;
  onClose: () => void;
  onScheduled: (newMission: MissionRow) => void;
}) {
  const isWeekly = mission.type === "weekly";
  const defaultFrom = new Date();
  defaultFrom.setSeconds(0, 0);

  const defaultUntil = new Date(defaultFrom);
  if (isWeekly) defaultUntil.setDate(defaultUntil.getDate() + 7);
  else          defaultUntil.setHours(23, 59, 0, 0);

  const [from,  setFrom]  = useState(toLocalDatetimeInput(defaultFrom.toISOString()));
  const [until, setUntil] = useState(toLocalDatetimeInput(defaultUntil.toISOString()));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleConfirm() {
    if (!from || !until) { setErr("Compila entrambe le date"); return; }
    if (toISO(from) >= toISO(until)) { setErr("La scadenza deve essere dopo l'attivazione"); return; }

    setSaving(true);
    setErr(null);
    try {
      // Crea una nuova istanza della missione con le date specificate
      const res = await fetch("/api/admin/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mission.type, emoji: mission.emoji, title: mission.title,
          description: mission.description, completion_message: mission.completion_message,
          mission_type: mission.mission_type, config: mission.config,
          points_reward: mission.points_reward, is_surprise: mission.is_surprise,
          max_completions: mission.max_completions,
          is_active: true, active_from: toISO(from), active_until: toISO(until),
        }),
      });
      const json = await res.json();
      if (!json.ok) { setErr(json.error ?? "Errore"); return; }
      onScheduled(json.mission);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontWeight: 950, fontSize: 18 }}>
        Programma — {mission.emoji} {mission.title}
      </div>
      <div style={{ opacity: 0.6, fontSize: 13, marginTop: -8 }}>
        Verrà creata una nuova istanza schedulata. Il template originale resta invariato.
      </div>
      <Field label="Attivazione">
        <input type="datetime-local" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} />
      </Field>
      <Field label={`Scadenza (default: +${isWeekly ? "7 giorni" : "1 giorno"})`}>
        <input type="datetime-local" style={inputStyle} value={until} onChange={(e) => setUntil(e.target.value)} />
      </Field>
      {err && <div style={{ color: "#dc2626", fontSize: 13 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose} disabled={saving}>Annulla</button>
        <button className="btn primary" onClick={handleConfirm} disabled={saving}>
          {saving ? "Programmando..." : "Conferma"}
        </button>
      </div>
    </Overlay>
  );
}

// ─── ConfigFields ─────────────────────────────────────────────────────────────

function ConfigFields({
  missionType,
  form,
  setForm,
  venues,
}: {
  missionType: MissionType;
  form: FormState;
  setForm: (f: FormState) => void;
  venues: VenueOption[];
}) {
  function update(patch: Partial<FormState>) {
    setForm({ ...form, ...patch });
  }

  switch (missionType) {
    case "checkin_receipt_amount":
      return (
        <Field label="Importo minimo (€)">
          <input type="number" min={0} step={0.5} style={inputStyle}
            value={form.cfg_min_amount}
            onChange={(e) => update({ cfg_min_amount: e.target.value })} />
        </Field>
      );

    case "checkin_category":
      return (
        <Field label="Categoria">
          <select style={inputStyle} value={form.cfg_category}
            onChange={(e) => update({ cfg_category: e.target.value })}>
            <option value="">— seleziona —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      );

    case "checkin_spot":
      return (
        <Field label="Spot specifico">
          <select style={inputStyle} value={form.cfg_spot_id}
            onChange={(e) => update({ cfg_spot_id: e.target.value })}>
            <option value="">— seleziona spot —</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
      );

    case "checkin_timeslot":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Ora inizio (HH:MM)">
            <input type="time" style={inputStyle} value={form.cfg_time_start}
              onChange={(e) => update({ cfg_time_start: e.target.value })} />
          </Field>
          <Field label="Ora fine (HH:MM)">
            <input type="time" style={inputStyle} value={form.cfg_time_end}
              onChange={(e) => update({ cfg_time_end: e.target.value })} />
          </Field>
        </div>
      );

    case "checkin_companion":
      return (
        <Field label="Numero minimo compagni">
          <input type="number" min={1} style={inputStyle}
            value={form.cfg_min_companions}
            onChange={(e) => update({ cfg_min_companions: e.target.value })} />
        </Field>
      );

    case "checkin_multiple":
      return (
        <Field label="Numero spot / azioni richieste">
          <input type="number" min={2} style={inputStyle}
            value={form.cfg_count}
            onChange={(e) => update({ cfg_count: e.target.value })} />
        </Field>
      );

    case "checkin_weekday":
      return (
        <Field label="Giorno della settimana">
          <select style={inputStyle} value={form.cfg_weekday}
            onChange={(e) => update({ cfg_weekday: e.target.value })}>
            <option value="">— seleziona —</option>
            {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </Field>
      );

    default:
      return null;
  }
}

// ─── MissionFormModal ─────────────────────────────────────────────────────────

function MissionFormModal({
  initial,
  venues,
  onClose,
  onSaved,
  editId,
}: {
  initial: FormState;
  venues: VenueOption[];
  onClose: () => void;
  onSaved: (m: MissionRow) => void;
  editId?: string;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isEdit = !!editId;
  const hasSchedule = !!(form.active_from && form.active_until);

  async function handleSave() {
    if (!form.title.trim()) { setErr("Il titolo è obbligatorio"); return; }

    setSaving(true);
    setErr(null);
    try {
      const payload = formToPayload(form, hasSchedule);

      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/admin/missions/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/missions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!json.ok) { setErr(json.error ?? "Errore"); return; }
      onSaved(json.mission);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontWeight: 950, fontSize: 18 }}>
        {isEdit ? "Modifica missione" : "Nuova missione"}
      </div>

      {/* Tipo daily/weekly */}
      <Field label="Tipo">
        <div style={{ display: "flex", gap: 8 }}>
          {(["daily", "weekly"] as const).map((t) => (
            <button key={t} type="button"
              className={`btn${form.type === t ? " primary" : ""}`}
              style={{ flex: 1 }}
              onClick={() => setForm({ ...form, type: t })}>
              {t === "daily" ? "Giornaliera" : "Settimanale"}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 10 }}>
        <Field label="Emoji">
          <input style={inputStyle} value={form.emoji} maxLength={4}
            onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
        </Field>
        <Field label="Titolo">
          <input style={inputStyle} value={form.title} placeholder="es. Esploratore del giorno"
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
      </div>

      <Field label="Descrizione">
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
          value={form.description} placeholder="Descrizione visibile all'utente"
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>

      <Field label="Tipo missione">
        <select style={inputStyle} value={form.mission_type}
          onChange={(e) => setForm({ ...form, mission_type: e.target.value as MissionType })}>
          {Object.entries(MISSION_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>

      <ConfigFields missionType={form.mission_type} form={form} setForm={setForm} venues={venues} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Punti reward">
          <input type="number" min={1} style={inputStyle} value={form.points_reward}
            onChange={(e) => setForm({ ...form, points_reward: Number(e.target.value) })} />
        </Field>
        <Field label="Limite completamenti (opz.)">
          <input type="number" min={1} style={inputStyle} value={form.max_completions}
            placeholder="Illimitato"
            onChange={(e) => setForm({ ...form, max_completions: e.target.value })} />
        </Field>
      </div>

      <Field label="Messaggio completamento (opz.)">
        <input style={inputStyle} value={form.completion_message}
          placeholder="es. Ottimo lavoro! 🎉"
          onChange={(e) => setForm({ ...form, completion_message: e.target.value })} />
      </Field>

      {/* Toggle sorpresa */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button"
          onClick={() => setForm({ ...form, is_surprise: !form.is_surprise })}
          style={{
            width: 40, height: 22, borderRadius: 999, border: "none", cursor: "pointer",
            background: form.is_surprise ? "#2D1B69" : "rgba(0,0,0,0.15)",
            transition: "background 0.2s",
            position: "relative",
          }}>
          <span style={{
            position: "absolute", top: 3, width: 16, height: 16, borderRadius: 999,
            background: "#fff", transition: "left 0.2s",
            left: form.is_surprise ? 20 : 3,
          }} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Missione sorpresa 🎁</span>
      </div>

      {/* Date opzionali */}
      <div style={{
        padding: 12, borderRadius: 12,
        border: "1px dashed rgba(0,0,0,0.12)",
        background: "rgba(0,0,0,0.02)",
        display: "grid", gap: 10,
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.55, textTransform: "uppercase" }}>
          Programmazione (lascia vuoto per salvare come template)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Attivazione">
            <input type="datetime-local" style={inputStyle} value={form.active_from}
              onChange={(e) => setForm({ ...form, active_from: e.target.value })} />
          </Field>
          <Field label="Scadenza">
            <input type="datetime-local" style={inputStyle} value={form.active_until}
              onChange={(e) => setForm({ ...form, active_until: e.target.value })} />
          </Field>
        </div>
      </div>

      {err && <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{err}</div>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose} disabled={saving}>Annulla</button>
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? "Salvo..." : isEdit ? "Salva modifiche" : hasSchedule ? "Crea e schedula" : "Salva template"}
        </button>
      </div>
    </Overlay>
  );
}

// ─── WeekPlannerModal ────────────────────────────────────────────────────────

function WeekPlannerModal({
  dailyMissions,
  onClose,
  onScheduled,
}: {
  dailyMissions: MissionRow[];
  onClose: () => void;
  onScheduled: (missions: MissionRow[]) => void;
}) {
  // Calcola il lunedì della prossima settimana
  const nextMonday = nextMondayAt(0, 0);

  // days[0]=Lun ... days[6]=Dom
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const templates = dailyMissions.filter((m) => getMissionStatus(m) === "template");

  function getDayDate(dayOffset: number) {
    const d = new Date(nextMonday);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }

  async function handleConfirm() {
    const entries = Object.entries(selections).filter(([, v]) => v);
    if (entries.length === 0) { setErr("Seleziona almeno una missione"); return; }

    setSaving(true);
    setErr(null);

    try {
      const results: MissionRow[] = [];

      await Promise.all(
        entries.map(async ([dayOffsetStr, missionId]) => {
          const dayOffset = Number(dayOffsetStr);
          const source = dailyMissions.find((m) => m.id === missionId);
          if (!source) return;

          const dayStart = getDayDate(dayOffset);
          dayStart.setHours(0, 0, 0, 0);

          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          const res = await fetch("/api/admin/missions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: source.type, emoji: source.emoji, title: source.title,
              description: source.description, completion_message: source.completion_message,
              mission_type: source.mission_type, config: source.config,
              points_reward: source.points_reward, is_surprise: source.is_surprise,
              max_completions: source.max_completions,
              is_active: true,
              active_from:  dayStart.toISOString(),
              active_until: dayEnd.toISOString(),
            }),
          });
          const json = await res.json();
          if (json.ok) results.push(json.mission);
        })
      );

      onScheduled(results);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Errore di rete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontWeight: 950, fontSize: 18 }}>Programma settimana</div>
      <div style={{ opacity: 0.6, fontSize: 13, marginTop: -8 }}>
        Settimana del {getDayDate(0).toLocaleDateString("it-IT", { day: "numeric", month: "long" })} –{" "}
        {getDayDate(6).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {WEEK_DAYS_ORDER.map((dayName, i) => {
          const date = getDayDate(i);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 13 }}>{dayName}</div>
                <div style={{ fontSize: 11, opacity: 0.55 }}>
                  {date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}
                </div>
              </div>
              <select
                style={inputStyle}
                value={selections[i] ?? ""}
                onChange={(e) => setSelections({ ...selections, [i]: e.target.value })}
              >
                <option value="">— nessuna —</option>
                {templates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.emoji} {m.title} (+{m.points_reward}pt)
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {err && <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{err}</div>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose} disabled={saving}>Annulla</button>
        <button className="btn primary" onClick={handleConfirm} disabled={saving}>
          {saving ? "Programmando..." : "Conferma settimana"}
        </button>
      </div>
    </Overlay>
  );
}

// ─── MissionCard ─────────────────────────────────────────────────────────────

function MissionCard({
  mission,
  onSchedule,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  mission: MissionRow;
  onSchedule:  (m: MissionRow) => void;
  onEdit:      (m: MissionRow) => void;
  onDuplicate: (m: MissionRow) => void;
  onDelete:    (m: MissionRow) => void;
}) {
  const status = getMissionStatus(mission);
  const sc = STATUS_CFG[status];
  const configSummary = buildConfigSummary(mission);

  return (
    <div style={{
      borderRadius: 16,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "rgba(255,255,255,0.8)",
      padding: "14px 16px",
      display: "grid",
      gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{mission.emoji}</span>
            <span style={{ fontWeight: 950, fontSize: 15 }}>{mission.title}</span>
            {mission.is_surprise && (
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(245,158,11,0.12)", color: "#b45309", fontWeight: 900 }}>
                sorpresa
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.4 }}>{mission.description}</div>
        </div>

        {/* Status badge */}
        <span style={{
          padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900,
          background: sc.bg, color: sc.color, height: "fit-content", whiteSpace: "nowrap",
        }}>
          {sc.label}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11, opacity: 0.65 }}>
        <span style={{ padding: "2px 7px", borderRadius: 999, background: "rgba(0,0,0,0.06)", fontWeight: 800 }}>
          {MISSION_TYPE_LABELS[mission.mission_type] ?? mission.mission_type}
        </span>
        {configSummary && (
          <span style={{ padding: "2px 7px", borderRadius: 999, background: "rgba(0,0,0,0.06)", fontWeight: 800 }}>
            {configSummary}
          </span>
        )}
        <span style={{ padding: "2px 7px", borderRadius: 999, background: "rgba(99,102,241,0.1)", color: "#4338ca", fontWeight: 900 }}>
          +{mission.points_reward} pt
        </span>
        <span style={{ padding: "2px 7px", borderRadius: 999, background: "rgba(0,0,0,0.05)", fontWeight: 800 }}>
          {mission.completions_count} completamenti
        </span>
      </div>

      {/* Date (se non template) */}
      {status !== "template" && (
        <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 700 }}>
          {fmtDatetime(mission.active_from)} → {fmtDatetime(mission.active_until)}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {status === "template" && (
          <button className="btn" style={{ fontSize: 12, padding: "5px 10px" }}
            onClick={() => onSchedule(mission)}>
            📅 Programma
          </button>
        )}
        <button className="btn" style={{ fontSize: 12, padding: "5px 10px" }}
          onClick={() => onEdit(mission)}>
          ✏️ Modifica
        </button>
        <button className="btn" style={{ fontSize: 12, padding: "5px 10px" }}
          onClick={() => onDuplicate(mission)}>
          📋 Duplica
        </button>
        <button
          className="btn"
          style={{ fontSize: 12, padding: "5px 10px", color: "#dc2626" }}
          onClick={() => onDelete(mission)}>
          🗑️ Elimina
        </button>
      </div>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function MissionsAdminClient({
  initialMissions,
  venues,
}: {
  initialMissions: MissionRow[];
  venues: VenueOption[];
}) {
  const [missions, setMissions] = useState<MissionRow[]>(initialMissions);
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [statusFilter, setStatusFilter] = useState<MissionStatus | "all">("all");

  const [scheduleTarget, setScheduleTarget] = useState<MissionRow | null>(null);
  const [editTarget,     setEditTarget]     = useState<MissionRow | null>(null);
  const [showNewForm,    setShowNewForm]     = useState(false);
  const [showWeekPlanner, setShowWeekPlanner] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<MissionRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  const [globalMsg, setGlobalMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function reloadMissions() {
    const res = await fetch("/api/admin/missions", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setMissions(json.missions);
  }

  async function handleBootstrap() {
    if (!confirm("Attiva tutti i template con date valide (365 giorni) e assegna a tutti gli utenti?")) return;
    setBootstrapping(true);
    try {
      const res = await fetch("/api/admin/missions/bootstrap", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        const dailyAssigned  = (json.daily?.assignments  ?? json.daily?.assigned  ?? "?");
        const weeklyAssigned = (json.weekly?.assignments ?? json.weekly?.assigned ?? "?");
        showMsg(true, `Attivate ${json.activated ?? "?"} missioni. Daily: ${dailyAssigned} assegnazioni, Weekly: ${weeklyAssigned} assegnazioni.`);
        await reloadMissions();
      } else {
        showMsg(false, json.error ?? "Errore bootstrap");
      }
    } catch {
      showMsg(false, "Errore di rete");
    } finally {
      setBootstrapping(false);
    }
  }

  async function handleAssign() {
    setAssigning(true);
    try {
      const res = await fetch("/api/admin/missions/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab }),
      });
      const json = await res.json();
      if (json.ok) {
        const assigned = json.assigned ?? json.inserted ?? "?";
        showMsg(true, `Assegnate ${assigned} nuove missioni ${tab === "daily" ? "giornaliere" : "settimanali"} agli utenti!`);
      } else {
        showMsg(false, json.error ?? "Errore nell'assegnazione");
      }
    } catch {
      showMsg(false, "Errore di rete");
    } finally {
      setAssigning(false);
    }
  }

  function showMsg(ok: boolean, text: string) {
    setGlobalMsg({ ok, text });
    setTimeout(() => setGlobalMsg(null), 3000);
  }

  function handleScheduled(newMission: MissionRow) {
    setMissions((prev) => [newMission, ...prev]);
    setScheduleTarget(null);
    showMsg(true, `Missione "${newMission.title}" programmata!`);
  }

  function handleSaved(mission: MissionRow) {
    setMissions((prev) => {
      const existing = prev.find((m) => m.id === mission.id);
      if (existing) return prev.map((m) => m.id === mission.id ? mission : m);
      return [mission, ...prev];
    });
    setEditTarget(null);
    setShowNewForm(false);
    showMsg(true, `Missione "${mission.title}" salvata!`);
  }

  function handleDuplicate(source: MissionRow) {
    const form = missionToForm(source);
    form.title = `${source.title} (copia)`;
    setEditTarget(null);
    setShowNewForm(false);
    // Apri form di creazione con dati pre-compilati
    setTimeout(() => {
      setShowNewForm(true);
      setDuplicateForm(form);
    }, 0);
  }

  const [duplicateForm, setDuplicateForm] = useState<FormState | null>(null);

  async function handleDelete(mission: MissionRow) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/missions/${mission.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        setMissions((prev) => prev.filter((m) => m.id !== mission.id));
        showMsg(true, `Missione eliminata.`);
      } else {
        showMsg(false, json.error ?? "Errore");
      }
    } catch {
      showMsg(false, "Errore di rete");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  }

  function handleWeekScheduled(newMissions: MissionRow[]) {
    setMissions((prev) => [...newMissions, ...prev]);
    setShowWeekPlanner(false);
    showMsg(true, `${newMissions.length} missioni programmate per la settimana!`);
  }

  // Missioni filtrate per tab e status
  const filtered = useMemo(() => {
    return missions.filter((m) => {
      if (m.type !== tab) return false;
      if (statusFilter !== "all" && getMissionStatus(m) !== statusFilter) return false;
      return true;
    });
  }, [missions, tab, statusFilter]);

  // Contatori per i tab di status
  const counts = useMemo(() => {
    const base = missions.filter((m) => m.type === tab);
    return {
      all:        base.length,
      template:   base.filter((m) => getMissionStatus(m) === "template").length,
      programmed: base.filter((m) => getMissionStatus(m) === "programmed").length,
      active:     base.filter((m) => getMissionStatus(m) === "active").length,
      expired:    base.filter((m) => getMissionStatus(m) === "expired").length,
    };
  }, [missions, tab]);

  return (
    <div className="card" style={{ display: "grid", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 22 }}>🎯 Missioni</div>
          <div style={{ opacity: 0.6, fontSize: 13, marginTop: 3 }}>
            Gestisci i template e programma le missioni giornaliere e settimanali.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Bootstrap: visibile se esistono template non ancora attivati */}
          {missions.some((m) => getMissionStatus(m) === "template") && (
            <button
              className="btn"
              onClick={handleBootstrap}
              disabled={bootstrapping}
              title="Attiva tutti i template con date valide e assegna subito a tutti gli utenti"
              style={{ background: "rgba(245,158,11,0.1)", color: "#92400e", border: "1px solid rgba(245,158,11,0.3)", fontWeight: 900 }}
            >
              {bootstrapping ? "Attivo..." : "🚀 Bootstrap missioni"}
            </button>
          )}
          {tab === "daily" && (
            <button className="btn" onClick={() => setShowWeekPlanner(true)}>
              📆 Programma settimana
            </button>
          )}
          <button
            className="btn"
            onClick={handleAssign}
            disabled={assigning}
            title={`Assegna subito le missioni ${tab === "daily" ? "giornaliere" : "settimanali"} attive a tutti gli utenti`}
          >
            {assigning ? "Assegno..." : "🔄 Assegna ora"}
          </button>
          <button className="btn primary" onClick={() => { setDuplicateForm(null); setShowNewForm(true); }}>
            + Nuova missione
          </button>
        </div>
      </div>

      {/* Feedback globale */}
      {globalMsg && (
        <div style={{
          padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: globalMsg.ok ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.1)",
          color: globalMsg.ok ? "#059669" : "#dc2626",
        }}>
          {globalMsg.ok ? "✅" : "❌"} {globalMsg.text}
        </div>
      )}

      {/* Tab giornaliere / settimanali */}
      <div className="tabs">
        {([["daily", "☀️ Giornaliere"], ["weekly", "📅 Settimanali"]] as const).map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? "active" : ""}`}
            onClick={() => { setTab(key); setStatusFilter("all"); }}>
            {label}
            <span className="pill">{missions.filter((m) => m.type === key).length}</span>
          </button>
        ))}
      </div>

      {/* Filtro status */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([
          ["all",        "Tutti",       counts.all],
          ["template",   "Template",    counts.template],
          ["programmed", "Programmate", counts.programmed],
          ["active",     "Attive",      counts.active],
          ["expired",    "Scadute",     counts.expired],
        ] as const).map(([key, label, count]) => (
          <button key={key}
            onClick={() => setStatusFilter(key)}
            style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800,
              border: "none", cursor: "pointer",
              background: statusFilter === key ? "#2D1B69" : "rgba(0,0,0,0.06)",
              color: statusFilter === key ? "#fff" : "inherit",
            }}>
            {label} <span style={{ opacity: 0.7 }}>({count})</span>
          </button>
        ))}
        <button onClick={reloadMissions}
          style={{
            padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800,
            border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer",
            background: "transparent", marginLeft: "auto",
          }}>
          ↻ Ricarica
        </button>
      </div>

      {/* Lista missioni */}
      {filtered.length === 0 ? (
        <div className="notice" style={{ fontSize: 13 }}>
          Nessuna missione in questa categoria.
          {statusFilter !== "all" && " Prova a rimuovere il filtro."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              onSchedule={setScheduleTarget}
              onEdit={setEditTarget}
              onDuplicate={handleDuplicate}
              onDelete={setDeleteConfirm}
            />
          ))}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {scheduleTarget && (
        <ScheduleModal
          mission={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onScheduled={handleScheduled}
        />
      )}

      {editTarget && (
        <MissionFormModal
          initial={missionToForm(editTarget)}
          venues={venues}
          editId={editTarget.id}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {showNewForm && (
        <MissionFormModal
          initial={duplicateForm ?? EMPTY_FORM}
          venues={venues}
          onClose={() => { setShowNewForm(false); setDuplicateForm(null); }}
          onSaved={handleSaved}
        />
      )}

      {showWeekPlanner && (
        <WeekPlannerModal
          dailyMissions={missions.filter((m) => m.type === "daily")}
          onClose={() => setShowWeekPlanner(false)}
          onScheduled={handleWeekScheduled}
        />
      )}

      {/* Conferma eliminazione */}
      {deleteConfirm && (
        <Overlay onClose={() => setDeleteConfirm(null)}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Elimina missione</div>
          <div style={{ fontSize: 14 }}>
            Sei sicuro di voler eliminare <b>{deleteConfirm.emoji} {deleteConfirm.title}</b>?
            {deleteConfirm.completions_count > 0 && (
              <span style={{ color: "#b45309", display: "block", marginTop: 6, fontSize: 13 }}>
                ⚠️ Ha {deleteConfirm.completions_count} completamenti — verrà solo disattivata.
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Annulla</button>
            <button
              className="btn"
              style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", fontWeight: 900 }}
              disabled={deleting}
              onClick={() => handleDelete(deleteConfirm)}>
              {deleting ? "Elimino..." : "Elimina"}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
