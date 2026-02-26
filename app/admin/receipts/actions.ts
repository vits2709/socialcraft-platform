"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";

function calculatePoints(amount: number | null): number {
  if (!amount) return 8;
  if (amount < 5)  return 4;
  if (amount < 15) return 8;
  if (amount < 30) return 12;
  if (amount < 50) return 18;
  return 25;
}

export async function decideReceiptAction(
  receiptId: string,
  decision: "approved" | "rejected",
  customReason?: string
) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) {
    throw new Error("not_allowed");
  }

  const supabase = createSupabaseAdminClient();

  const { data: r, error: rErr } = await supabase
    .from("receipt_verifications")
    .select("id, status, validation_status, user_id, venue_id, ai_extracted_amount, amount, points_amount")
    .eq("id", receiptId)
    .maybeSingle();

  if (rErr) throw new Error(rErr.message);
  if (!r) throw new Error("not_found");

  // Permette di decidere sia pending che manual_review
  const alreadyDecided = r.status !== "pending" && r.validation_status !== "manual_review";
  if (alreadyDecided) {
    revalidatePath("/admin/receipts");
    return;
  }

  const now = new Date().toISOString();
  const rejectionReason = customReason?.trim() || (decision === "rejected" ? "Rifiutato manualmente" : null);

  await supabase
    .from("receipt_verifications")
    .update({
      status:            decision,
      validation_status: decision,
      reason:            decision === "rejected" ? rejectionReason : null,
      decided_at:        now,
      validated_at:      now,
    })
    .eq("id", receiptId);

  if (decision === "approved") {
    const extractedAmount = r.ai_extracted_amount ?? r.amount ?? null;
    const points = r.points_amount ?? calculatePoints(extractedAmount);

    const [{ data: uRow, error: uErr }, { data: vRow, error: vErr }] = await Promise.all([
      supabase.from("sc_users").select("name, points").eq("id", r.user_id).maybeSingle(),
      supabase.from("venues").select("name, slug, city").eq("id", r.venue_id).maybeSingle(),
    ]);

    if (uErr) throw new Error(`load_user_failed:${uErr.message}`);
    if (vErr) throw new Error(`load_spot_failed:${vErr.message}`);

    const spotName = vRow?.name?.trim() || "Spot";
    const spotMeta = [vRow?.slug && `slug=${vRow.slug}`, vRow?.city && `city=${vRow.city}`]
      .filter(Boolean).join(" ") || null;

    const newPoints = (uRow?.points ?? 0) + points;
    const { error: upPointsErr } = await supabase
      .from("sc_users")
      .update({ points: newPoints, updated_at: now })
      .eq("id", r.user_id);
    if (upPointsErr) throw new Error(`update_user_points_failed:${upPointsErr.message}`);

    // Guard atomico
    await supabase
      .from("receipt_verifications")
      .update({ points_awarded: true, points_amount: points })
      .eq("id", receiptId)
      .eq("points_awarded", false);

    const { error: evErr } = await supabase.from("user_events").insert({
      user_id:      r.user_id,
      venue_id:     r.venue_id,
      event_type:   "receipt",
      points,
      points_delta: points,
    });
    if (evErr) throw new Error(`user_events_failed:${evErr.message}`);

    const { error: incVenueErr } = await supabase.rpc("increment_venue_score_uuid", {
      p_venue_id: r.venue_id,
      p_points:   points,
      p_name:     spotName,
      p_meta:     spotMeta,
    });
    if (incVenueErr) throw new Error(`increment_venue_failed:${incVenueErr.message}`);
  }

  revalidatePath("/admin/receipts");
  revalidatePath("/admin");
  revalidatePath("/");
}
