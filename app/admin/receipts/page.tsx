import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import ReceiptsAdminClient, { type ReceiptRow } from "./ReceiptsAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminReceiptsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const supabase = createSupabaseAdminClient();

  const { data: raw, error } = await supabase
    .from("receipt_verifications")
    .select(
      "id,status,validation_status,reason,ai_rejection_reason,user_id,venue_id," +
      "image_path,ai_result,ai_extracted_name,ai_extracted_date,ai_extracted_amount," +
      "ai_confidence,points_amount,ai_checked_at,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="card">
        <div className="notice">Errore caricamento: {error.message}</div>
      </div>
    );
  }

  // Cast necessario: le nuove colonne non sono ancora nel tipo generato da Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (raw ?? []) as any[];

  // Fetch nomi utenti (in batch)
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: users } = await supabase
    .from("sc_users")
    .select("id, name")
    .in("id", userIds);
  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.name ?? null]));

  // Fetch nomi venue (in batch)
  const venueIds = [...new Set(rows.map((r) => r.venue_id))];
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name")
    .in("id", venueIds);
  const venueMap = Object.fromEntries((venues ?? []).map((v) => [v.id, v.name ?? null]));

  // Genera signed URL solo per i manual_review (quelli su cui l'admin agisce)
  // Per gli altri, genera solo se sono meno di 30 (evita troppe request)
  const manualReviewRows = rows.filter((r) => r.validation_status === "manual_review");
  const otherRows = rows.filter((r) => r.validation_status !== "manual_review").slice(0, 30);
  const toSign = [...manualReviewRows, ...otherRows];

  const signedUrls: Record<string, string> = {};
  await Promise.all(
    toSign.map(async (r) => {
      if (!r.image_path) return;
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(r.image_path, 3600); // 1 ora
      if (data?.signedUrl) signedUrls[r.id] = data.signedUrl;
    })
  );

  const receipts: ReceiptRow[] = rows.map((r) => ({
    id:                  r.id,
    status:              r.status ?? "pending",
    validation_status:   r.validation_status ?? r.status ?? "pending",
    reason:              r.reason ?? null,
    ai_rejection_reason: r.ai_rejection_reason ?? null,
    user_id:             r.user_id,
    user_name:           userMap[r.user_id] ?? null,
    venue_id:            r.venue_id,
    venue_name:          venueMap[r.venue_id] ?? null,
    image_path:          r.image_path,
    image_url:           signedUrls[r.id] ?? null,
    ai_result:           r.ai_result ?? null,
    ai_extracted_name:   r.ai_extracted_name ?? null,
    ai_extracted_date:   r.ai_extracted_date ?? null,
    ai_extracted_amount: r.ai_extracted_amount ?? null,
    ai_confidence:       r.ai_confidence ?? null,
    points_amount:       r.points_amount ?? null,
    ai_checked_at:       r.ai_checked_at ?? null,
    created_at:          r.created_at,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>🧾 Scontrini</h1>
          <div style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>
            {rows.length} totali · {manualReviewRows.length} in revisione
          </div>
        </div>
      </div>

      <ReceiptsAdminClient receipts={receipts} />
    </div>
  );
}
