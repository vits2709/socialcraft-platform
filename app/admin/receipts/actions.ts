"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";

export async function decideReceiptAction(receiptId: string, decision: "approved" | "rejected") {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) {
    throw new Error("not_allowed");
  }

  const supabase = createSupabaseAdminClient();

  // 1) leggi lo scontrino
  const { data: r, error: rErr } = await supabase
    .from("receipt_verifications")
    .select("id,status,user_id,venue_id")
    .eq("id", receiptId)
    .maybeSingle();

  if (rErr) throw new Error(rErr.message);
  if (!r) throw new Error("not_found");

  // se già gestito, refresh
  if (r.status !== "pending") {
    revalidatePath("/admin/receipts");
    return;
  }

  // 2) aggiorna stato
  const { error: upErr } = await supabase
    .from("receipt_verifications")
    .update({
      status: decision,
      reason: decision === "rejected" ? "manual_reject" : null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", receiptId);

  if (upErr) throw new Error(upErr.message);

  // 3) se approvato: +8 punti all'utente (consumazione)
  if (decision === "approved") {
    const points = 8;

    // prendi nome utente e nome spot (così NON sovrascrive nickname)
    const [{ data: uRow, error: uErr }, { data: vRow, error: vErr }] = await Promise.all([
      supabase.from("sc_users").select("name").eq("id", r.user_id).maybeSingle(),
      supabase.from("venues").select("name,slug,city").eq("id", r.venue_id).maybeSingle(),
    ]);

    if (uErr) throw new Error(`load_user_failed:${uErr.message}`);
    if (vErr) throw new Error(`load_spot_failed:${vErr.message}`);

    const safeUserName =
      (uRow?.name && String(uRow.name).trim().length > 0 ? String(uRow.name).trim() : "Guest");

    const spotName =
      (vRow?.name && String(vRow.name).trim().length > 0 ? String(vRow.name).trim() : "Spot");

    const spotMetaParts: string[] = [];
    if (vRow?.slug) spotMetaParts.push(`slug=${vRow.slug}`);
    if (vRow?.city) spotMetaParts.push(`city=${vRow.city}`);
    const spotMeta = spotMetaParts.length ? spotMetaParts.join(" ") : null;

    // aggiorna punti utente su sc_users (fonte unica di verità)
    const { data: uPoints, error: uPointsErr } = await supabase
      .from("sc_users")
      .select("points")
      .eq("id", r.user_id)
      .maybeSingle();
    if (uPointsErr) throw new Error(`load_user_points_failed:${uPointsErr.message}`);
    const newPoints = (uPoints?.points ?? 0) + points;
    const { error: upErr } = await supabase
      .from("sc_users")
      .update({ points: newPoints, updated_at: new Date().toISOString() })
      .eq("id", r.user_id);
    if (upErr) throw new Error(`update_user_points_failed:${upErr.message}`);

    // user_events: event_type corretto = receipt
    const { error: evErr } = await supabase.from("user_events").insert({
      user_id: r.user_id,
      venue_id: r.venue_id,
      event_type: "receipt",
      points,
      points_delta: points,
    });
    if (evErr) throw new Error(`user_events_failed:${evErr.message}`);

    // leaderboard_venues: passa p_name e p_meta reali (NO null)
    const { error: incVenueErr } = await supabase.rpc("increment_venue_score_uuid", {
      p_venue_id: r.venue_id,
      p_points: points,
      p_name: spotName,
      p_meta: spotMeta,
    });
    if (incVenueErr) throw new Error(`increment_venue_failed:${incVenueErr.message}`);
  }

  // 4) refresh UI
  revalidatePath("/admin/receipts");
  revalidatePath("/admin");
  revalidatePath("/");
}