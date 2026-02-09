"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function deleteUserAction(userId: string): Promise<void> {
  const me = await getSessionUser();
  if (!me || !(await isAdmin(me.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();
  const id = String(userId || "").trim();
  if (!id) throw new Error("missing_user_id");

  // 1) Se UUID → pulizia su tabelle collegate a sc_users (FK)
  if (isUuid(id)) {
    // Ordine: prima i figli, poi il profilo
    const { error: ueErr } = await supabase.from("user_events").delete().eq("user_id", id);
    if (ueErr) throw new Error(`delete_user_events_failed: ${ueErr.message}`);

    const { error: veErr } = await supabase.from("venue_events").delete().eq("user_id", id);
    if (veErr) throw new Error(`delete_venue_events_failed: ${veErr.message}`);

    const { error: vrErr } = await supabase.from("venue_ratings").delete().eq("user_id", id);
    if (vrErr) throw new Error(`delete_venue_ratings_failed: ${vrErr.message}`);

    const { error: scErr } = await supabase.from("sc_users").delete().eq("id", id);
    if (scErr) throw new Error(`delete_sc_users_failed: ${scErr.message}`);
  }

  // 2) Sempre → pulizia leaderboard_users (anche per id test tipo "u_vitale")
  const { error: lbErr } = await supabase.from("leaderboard_users").delete().eq("id", id);
  if (lbErr) throw new Error(`delete_leaderboard_users_failed: ${lbErr.message}`);

  // refresh UI
  revalidatePath("/admin/users");
  revalidatePath("/");
}