import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decideReceiptAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AiResult = {
  extracted: { data: string | null; ora: string | null; importo: number | null; locale: string | null };
  reasons: string[];
  auto_approved: boolean;
};

type ReceiptRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | string;
  reason: string | null;
  user_id: string;
  venue_id: string;
  image_path: string;
  image_hash: string | null;
  ai_result: AiResult | null;
  ai_checked_at: string | null;
  created_at: string;
};

export default async function AdminReceiptsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const supabase = createSupabaseAdminClient();

  // ✅ IMPORTANT: usa admin client, così RLS non blocca
  const { data, error } = await supabase
    .from("receipt_verifications")
    .select("id,status,reason,user_id,venue_id,image_path,image_hash,ai_result,ai_checked_at,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const receipts = (data ?? []) as ReceiptRow[];

  const pending = receipts.filter((r) => r.status === "pending");
  const decided = receipts.filter((r) => r.status !== "pending");

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Scontrini da verificare
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Pending: <b>{pending.length}</b> • Totale: <b>{receipts.length}</b>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn" href="/admin">
            ← Admin
          </Link>
        </div>
      </div>

      {error ? (
        <div className="notice">Errore: {error.message}</div>
      ) : null}

      {/* PENDING */}
      <div className="notice" style={{ marginBottom: 12 }}>
        <b>Da verificare</b>
      </div>

      {pending.length === 0 ? (
        <div className="notice">Nessuno scontrino in pending.</div>
      ) : (
        <table className="table" aria-label="Pending receipts">
          <thead>
            <tr>
              <th>ID</th>
              <th>Utente / Spot</th>
              <th>AI Check</th>
              <th>Creato</th>
              <th style={{ textAlign: "right" }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((r) => {
              const ai = r.ai_result;
              const hasAi = !!r.ai_checked_at;
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontFamily: "monospace", fontSize: 11 }}>{r.id.slice(0, 8)}…</div>
                    <div className="muted" style={{ fontSize: 11 }}>hash: {r.image_hash?.slice(0, 12) ?? "—"}…</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{r.image_path}</div>
                  </td>
                  <td>
                    <div className="muted" style={{ fontSize: 12 }}>{r.user_id.slice(0, 12)}…</div>
                    <div className="muted" style={{ fontSize: 12 }}>{r.venue_id.slice(0, 12)}…</div>
                  </td>
                  <td style={{ minWidth: 180 }}>
                    {!hasAi ? (
                      <span className="muted" style={{ fontSize: 12 }}>In attesa AI…</span>
                    ) : ai ? (
                      <div style={{ fontSize: 12 }}>
                        <div>📅 {ai.extracted?.data ?? "—"}</div>
                        <div>💰 €{ai.extracted?.importo ?? "—"}</div>
                        <div>🏪 {ai.extracted?.locale ?? "—"}</div>
                        {ai.reasons?.length > 0 && (
                          <div
                            style={{
                              marginTop: 4,
                              padding: "3px 8px",
                              borderRadius: 8,
                              background: "rgba(239,68,68,0.08)",
                              color: "#dc2626",
                              fontSize: 11,
                            }}
                          >
                            ⚠️ {ai.reasons.join(", ")}
                          </div>
                        )}
                        {ai.auto_approved && (
                          <div style={{ color: "#059669", fontWeight: 700, marginTop: 2, fontSize: 11 }}>
                            ✅ AI ha auto-approvato
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>AI: errore analisi</span>
                    )}
                    {r.reason && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                        Motivo: {r.reason}
                      </div>
                    )}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleString("it-IT")}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <form action={decideReceiptAction.bind(null, r.id, "approved")}>
                        <button className="btn primary" type="submit">
                          Approva (+8)
                        </button>
                      </form>

                      <form action={decideReceiptAction.bind(null, r.id, "rejected")}>
                        <button className="btn" type="submit">
                          Rifiuta
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* DECISI (collassabile “povero”) */}
      <div className="notice" style={{ marginTop: 16, marginBottom: 12 }}>
        <b>Già gestiti</b> <span className="muted">(ultimi {Math.min(50, decided.length)})</span>
      </div>

      {decided.length === 0 ? (
        <div className="notice">Ancora nessuno scontrino gestito.</div>
      ) : (
        <table className="table" aria-label="Decided receipts">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Creato</th>
            </tr>
          </thead>
          <tbody>
            {decided.slice(0, 50).map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.id}</td>
                <td>
                  <b>{r.status}</b>
                </td>
                <td className="muted">{r.reason ?? "—"}</td>
                <td className="muted">{new Date(r.created_at).toLocaleString("it-IT")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}