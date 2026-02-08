"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function deleteVenueAction(venueId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();

  // 1) Recupera owner_user_id (così possiamo eliminare anche l'utente Auth collegato)
  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id, owner_user_id")
    .eq("id", venueId)
    .maybeSingle();

  if (vErr) throw new Error(vErr.message);
  if (!venue) throw new Error("venue_not_found");

  // 2) Elimina promo della venue (se non hai FK con ON DELETE CASCADE)
  const { error: pErr } = await supabase.from("venue_promos").delete().eq("venue_id", venueId);
  if (pErr) throw new Error(pErr.message);

  // 3) Elimina leaderboard row (id TEXT che contiene UUID come stringa)
  const { error: lbErr } = await supabase.from("leaderboard_venues").delete().eq("id", String(venueId));
  if (lbErr) throw new Error(lbErr.message);

  // 4) Elimina venue
  const { error: delVenueErr } = await supabase.from("venues").delete().eq("id", venueId);
  if (delVenueErr) throw new Error(delVenueErr.message);

  // 5) Elimina l'utente Auth collegato (se esiste)
  if (venue.owner_user_id) {
    const { error: delUserErr } = await supabase.auth.admin.deleteUser(venue.owner_user_id);
    // se fallisce non blocchiamo tutto (per evitare edge-case), ma puoi anche fare throw se preferisci
    if (delUserErr) {
      // eslint-disable-next-line no-console
      console.warn("Auth user delete failed:", delUserErr.message);
    }
  }

  revalidatePath("/admin");
  // rimani in /admin (o torna lì se eri in una sub-page)
  redirect("/admin");
}