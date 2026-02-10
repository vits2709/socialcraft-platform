import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decideReceiptAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReceiptRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | string;
  reason: string | null;
  user_id: string;
  venue_id: string;
  image_path: string;
  image_hash: string | null;
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
    .select("id,status,reason,user_id,venue_id,image_path,image_hash,created_at")
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
              <th>Utente</th>
              <th>Spot</th>
              <th>Path</th>
              <th>Creato</th>
              <th style={{ textAlign: "right" }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.id}>
                <td>
                  <b>{r.id}</b>
                  <div className="muted">hash: {r.image_hash ?? "—"}</div>
                </td>
                <td className="muted">{r.user_id}</td>
                <td className="muted">{r.venue_id}</td>
                <td className="muted">{r.image_path}</td>
                <td className="muted">{new Date(r.created_at).toLocaleString("it-IT")}</td>
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
            ))}
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