"use client";

import Link from "next/link";
import { useState } from "react";

type VenueOption = { id: string; name: string };

type PrizeRow = {
  id: string;
  week_start: string;
  prize_description: string;
  prize_image: string | null;
  spot_id: string | null;
  winner_user_id: string | null;
  winner_name: string | null;
  winner_assigned_at: string | null;
  redemption_code: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
  venues: { id: string; name: string } | null;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

// Calcola il lunedì della settimana corrente
function currentMonday() {
  const d = new Date();
  const day = d.getUTCDay(); // 0=dom
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

// Lunedì della settimana prossima
function nextMonday() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff + 7);
  return d.toISOString().slice(0, 10);
}

export default function PrizesAdminClient({
  initialPrizes,
  venues,
}: {
  initialPrizes: PrizeRow[];
  venues: VenueOption[];
}) {
  const [prizes, setPrizes] = useState<PrizeRow[]>(initialPrizes);

  // Form nuovo premio
  const [weekStart, setWeekStart] = useState(nextMonday());
  const [description, setDescription] = useState("");
  const [spotId, setSpotId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Assegnazione vincitore manuale
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSavePrize(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch("/api/admin/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start: weekStart,
          prize_description: description.trim(),
          spot_id: spotId || null,
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        setSaveMsg({ ok: false, text: json.error ?? "Errore salvataggio" });
      } else {
        setSaveMsg({ ok: true, text: "Premio salvato! Ricarica per aggiornare la lista." });
        setDescription("");
        // Aggiorna lista locale
        const refreshRes = await fetch("/api/admin/prizes");
        const refreshJson = await refreshRes.json();
        if (refreshJson?.ok && refreshJson.prizes) setPrizes(refreshJson.prizes);
      }
    } catch (err: any) {
      setSaveMsg({ ok: false, text: err?.message ?? "Errore di rete" });
    }

    setSaving(false);
  }

  async function handleAssignWinner() {
    setAssigning(true);
    setAssignMsg(null);

    try {
      const res = await fetch("/api/admin/prizes/assign", { method: "POST" });
      const json = await res.json();

      if (!json.ok) {
        setAssignMsg({ ok: false, text: json.error ?? "Errore assegnazione" });
      } else {
        const r = json.result ?? {};
        if (r.ok) {
          setAssignMsg({ ok: true, text: `✅ Vincitore assegnato: ${r.winner_name} — codice: ${r.redemption_code}` });
        } else {
          setAssignMsg({ ok: false, text: `Nessun vincitore: ${r.reason ?? "errore sconosciuto"}` });
        }
        // Refresh lista
        const refreshRes = await fetch("/api/admin/prizes");
        const refreshJson = await refreshRes.json();
        if (refreshJson?.ok && refreshJson.prizes) setPrizes(refreshJson.prizes);
      }
    } catch (err: any) {
      setAssignMsg({ ok: false, text: err?.message ?? "Errore di rete" });
    }

    setAssigning(false);
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="cardHead" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 4 }}>🏆 Premi settimanali</h1>
          <p className="muted" style={{ margin: 0 }}>Configura i premi e assegna i vincitori.</p>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <Link className="btn" href="/admin">← Admin</Link>
        </div>
      </div>

      {/* Form nuovo premio */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: "1px dashed rgba(0,0,0,0.12)",
          background: "rgba(255,255,255,0.6)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>Configura un premio</div>
        <form onSubmit={handleSavePrize} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.6 }}>Settimana (lunedì)</label>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                required
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.15)",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.6 }}>Spot (opzionale)</label>
              <select
                value={spotId}
                onChange={(e) => setSpotId(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.15)",
                  fontSize: 14,
                  fontWeight: 700,
                  background: "white",
                }}
              >
                <option value="">— Nessuno spot —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.6 }}>Descrizione premio *</label>
            <input
              type="text"
              placeholder="Es: Consumazione gratuita da Caffè Roma"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={200}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.15)",
                fontSize: 14,
                fontWeight: 700,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="submit"
              className="btn primary"
              disabled={saving || !description.trim()}
            >
              {saving ? "Salvo..." : "Salva premio"}
            </button>
            {saveMsg && (
              <div style={{ fontSize: 13, fontWeight: 700, color: saveMsg.ok ? "#059669" : "#dc2626" }}>
                {saveMsg.text}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Assegnazione vincitore */}
      <div
        style={{
          marginTop: 12,
          padding: 16,
          borderRadius: 16,
          border: "1px dashed rgba(245,158,11,0.35)",
          background: "rgba(254,243,199,0.4)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>Assegna vincitore (settimana precedente)</div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Esegue <code>finalize_weekly_rankings()</code> e <code>assign_weekly_winner()</code>.
          Da usare lunedì mattina dopo la fine della settimana.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={handleAssignWinner}
            disabled={assigning}
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", fontWeight: 900 }}
          >
            {assigning ? "Assegnando..." : "🏆 Assegna vincitore"}
          </button>
          {assignMsg && (
            <div style={{ fontSize: 13, fontWeight: 700, color: assignMsg.ok ? "#059669" : "#dc2626" }}>
              {assignMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Lista premi */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>Storico premi</div>
        {prizes.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Nessun premio configurato ancora.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Settimana</th>
                <th>Premio</th>
                <th>Spot</th>
                <th>Vincitore</th>
                <th>Codice</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {prizes.map((p) => (
                <tr key={p.id}>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmt(p.week_start)}</td>
                  <td style={{ fontWeight: 700 }}>{p.prize_description}</td>
                  <td className="muted">{(p.venues as any)?.name ?? "—"}</td>
                  <td>
                    {p.winner_name ? (
                      <span style={{ fontWeight: 700 }}>{p.winner_name}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {p.redemption_code ? (
                      <code style={{ fontWeight: 900, fontSize: 13, background: "rgba(0,0,0,0.06)", padding: "2px 8px", borderRadius: 6 }}>
                        {p.redemption_code}
                      </code>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {!p.winner_user_id ? (
                      <span className="badge" style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}>In corso</span>
                    ) : p.redeemed ? (
                      <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}>✅ Riscattato</span>
                    ) : (
                      <span className="badge" style={{ background: "rgba(245,158,11,0.1)", color: "#b45309" }}>🎁 Da riscattare</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
