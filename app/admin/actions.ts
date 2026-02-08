"use server";

import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deleteVenueAction(venueId: string) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();

  // prende owner_user_id per eliminare anche l'utente auth
  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id, owner_user_id")
    .eq("id", venueId)
    .maybeSingle();

  if (vErr) throw new Error(vErr.message);
  if (!venue) throw new Error("venue_not_found");

  const ownerUserId = venue.owner_user_id as string | null;

  // 1) promo
  await supabase.from("venue_promos").delete().eq("venue_id", venueId);

  // 2) eventi (se hai nomi diversi dimmeli e li allineo)
  // se non esistono tabelle, commentale oppure dimmi i nomi reali
  await supabase.from("scan_events").delete().eq("venue_id", venueId);
  await supabase.from("rating_events").delete().eq("venue_id", venueId);

  // 3) leaderboard (se esiste)
  await supabase.from("leaderboard_venues").delete().eq("id", String(venueId));

  // 4) venue
  const { error: delVenueErr } = await supabase.from("venues").delete().eq("id", venueId);
  if (delVenueErr) throw new Error(delVenueErr.message);

  // 5) utente auth proprietario (se vuoi NON cancellarlo, dimmelo e lo tolgo)
  if (ownerUserId) {
    await supabase.auth.admin.deleteUser(ownerUserId);
  }

  revalidatePath("/admin");
  return { ok: true };
}