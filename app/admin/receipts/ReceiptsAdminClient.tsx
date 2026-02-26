"use client";

import { useState } from "react";
import { decideReceiptAction } from "./actions";

type AiResult = {
  extracted: { data?: string | null; ora?: string | null; importo?: number | null; locale?: string | null };
  reasons: string[];
  auto_approved: boolean;
};

export type ReceiptRow = {
  id: string;
  status: string;
  validation_status: string;
  reason: string | null;
  ai_rejection_reason: string | null;
  user_id: string;
  user_name: string | null;
  venue_id: string;
  venue_name: string | null;
  image_path: string;
  image_url: string | null;        // signed URL generato lato server
  ai_result: AiResult | null;
  ai_extracted_name: string | null;
  ai_extracted_date: string | null;
  ai_extracted_amount: number | null;
  ai_confidence: string | null;
  points_amount: number | null;
  ai_checked_at: string | null;
  created_at: string;
};

type Tab = "manual_review" | "approved" | "rejected";

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   "#059669",
  medium: "#b45309",
  low:    "#dc2626",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

function ConfidenceBadge({ c }: { c: string | null }) {
  if (!c) return <span style={{ opacity: 0.5, fontSize: 11 }}>—</span>;
  const labels: Record<string, string> = { high: "Alta", medium: "Media", low: "Bassa" };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 900,
      background: `${CONFIDENCE_COLOR[c]}18`, color: CONFIDENCE_COLOR[c],
    }}>
      {labels[c] ?? c}
    </span>
  );
}

function RejectForm({ receiptId, onDone }: { receiptId: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await decideReceiptAction(receiptId, "rejected", reason || undefined);
      onDone();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo rifiuto (opzionale)"
        style={{
          flex: 1, minWidth: 160, padding: "5px 10px", borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.15)", fontSize: 13,
        }}
      />
      <button className="btn" onClick={submit} disabled={busy} style={{ whiteSpace: "nowrap" }}>
        {busy ? "..." : "❌ Rifiuta"}
      </button>
    </div>
  );
}

function ReceiptCard({ r }: { r: ReceiptRow }) {
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [decided, setDecided] = useState(false);

  if (decided) return null;

  async function approve() {
    setBusy(true);
    try {
      await decideReceiptAction(r.id, "approved");
      setDecided(true);
    } catch {
      setBusy(false);
    }
  }

  const ai = r.ai_result;
  const isManualReview = r.validation_status === "manual_review" || r.validation_status === "pending";

  return (
    <div style={{
      borderRadius: 16, border: "1px solid rgba(0,0,0,0.09)",
      background: "#fff", padding: "14px 16px", display: "grid", gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Thumbnail */}
        {r.image_url && (
          <div style={{ flexShrink: 0 }}>
            <img
              src={r.image_url}
              alt="Scontrino"
              onClick={() => setImgOpen(true)}
              style={{
                width: 64, height: 64, objectFit: "cover",
                borderRadius: 10, cursor: "pointer",
                border: "1.5px solid rgba(0,0,0,0.1)",
              }}
            />
          </div>
        )}

        {/* Dati AI */}
        <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.5 }}>
              {r.id.slice(0, 8)}…
            </span>
            <ConfidenceBadge c={r.ai_confidence} />
            {r.validation_status === "manual_review" && (
              <span style={{ fontSize: 11, fontWeight: 900, color: "#b45309", padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.1)" }}>
                ⚠️ Revisione manuale
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6, fontSize: 13 }}>
            <div>🏪 <b>{r.ai_extracted_name ?? ai?.extracted?.locale ?? "—"}</b></div>
            <div>📅 {r.ai_extracted_date ?? ai?.extracted?.data ?? "—"}</div>
            <div>💰 €{r.ai_extracted_amount?.toFixed(2) ?? ai?.extracted?.importo ?? "—"}</div>
            {r.points_amount && <div>🏅 {r.points_amount} punti</div>}
          </div>

          {(r.ai_rejection_reason || (ai?.reasons && ai.reasons.length > 0)) && (
            <div style={{ fontSize: 11, color: "#dc2626", opacity: 0.85 }}>
              ⚠️ {r.ai_rejection_reason ?? ai?.reasons?.join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Info utente / spot */}
      <div style={{ display: "flex", gap: 16, fontSize: 12, opacity: 0.7, flexWrap: "wrap" }}>
        <span>👤 {r.user_name ?? r.user_id.slice(0, 10) + "…"}</span>
        <span>📍 {r.venue_name ?? r.venue_id.slice(0, 10) + "…"}</span>
        <span>🕐 {fmtDate(r.created_at)}</span>
        {r.reason && <span style={{ color: "#dc2626" }}>Motivo: {r.reason}</span>}
      </div>

      {/* Azioni (solo per manual_review) */}
      {isManualReview && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={approve} disabled={busy}>
              {busy ? "..." : "✅ Approva"}
            </button>
            <button className="btn" onClick={() => setShowReject((v) => !v)} disabled={busy}>
              {showReject ? "Annulla" : "❌ Rifiuta"}
            </button>
          </div>
          {showReject && <RejectForm receiptId={r.id} onDone={() => setDecided(true)} />}
        </div>
      )}

      {/* Lightbox */}
      {imgOpen && r.image_url && (
        <div
          onClick={() => setImgOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <img src={r.image_url} alt="Scontrino" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}

export default function ReceiptsAdminClient({ receipts }: { receipts: ReceiptRow[] }) {
  const [tab, setTab] = useState<Tab>("manual_review");

  // "pending" = AI non ancora conclusa o fallita → trattare come revisione manuale
  const manualReview = receipts.filter(
    (r) => r.validation_status === "manual_review" || r.validation_status === "pending"
  );
  const approved     = receipts.filter((r) => r.validation_status === "approved");
  const rejected     = receipts.filter((r) => r.validation_status === "rejected");

  const today = new Date().toISOString().slice(0, 10);
  const todayAll      = receipts.filter((r) => r.created_at.startsWith(today));
  const todayApproved = approved.filter((r) => r.created_at.startsWith(today));
  const todayRejected = rejected.filter((r) => r.created_at.startsWith(today));
  const autoApproved  = approved.filter((r) => r.ai_result?.auto_approved).length;
  const approvalRate  = approved.length > 0
    ? Math.round((autoApproved / (approved.length + rejected.length)) * 100) : 0;

  const shown = tab === "manual_review" ? manualReview : tab === "approved" ? approved : rejected;

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* Statistiche */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
        gap: 10,
      }}>
        {[
          { label: "Totale oggi", value: todayAll.length, color: "#6366f1" },
          { label: "In revisione", value: manualReview.length, color: manualReview.length > 0 ? "#dc2626" : "#059669" },
          { label: "Approvati oggi", value: todayApproved.length, color: "#059669" },
          { label: "Rifiutati oggi", value: todayRejected.length, color: "#dc2626" },
          { label: "Tasso auto-ok", value: `${approvalRate}%`, color: "#6366f1" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: "12px 14px", borderRadius: 14,
            background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
            display: "grid", gap: 4,
          }}>
            <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 950, color }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Tab */}
      <div className="tabs">
        {([
          { key: "manual_review" as Tab, label: "⚠️ In Revisione", count: manualReview.length, urgent: manualReview.length > 0 },
          { key: "approved"      as Tab, label: "✅ Approvati",     count: approved.length,     urgent: false },
          { key: "rejected"      as Tab, label: "❌ Rifiutati",     count: rejected.length,     urgent: false },
        ]).map(({ key, label, count, urgent }) => (
          <button
            key={key}
            className={`tab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
            type="button"
          >
            {label}{" "}
            <span
              className="pill"
              style={urgent ? { background: "rgba(239,68,68,0.15)", color: "#dc2626" } : undefined}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {shown.length === 0 ? (
        <div className="notice">Nessuno scontrino in questa categoria.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {shown.map((r) => <ReceiptCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}
