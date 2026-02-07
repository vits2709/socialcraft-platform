"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";

function mustStr(fd: FormData, key: string) {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) throw new Error(`missing_${key}`);
  return v;
}

export async function createVenueAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) {
    throw new Error("not_allowed");
  }

  const name = mustStr(formData, "name");
  const city = mustStr(formData, "city");
  const email = mustStr(formData, "email");
  const password = mustStr(formData, "password");

  const supabase = createSupabaseAdminClient();

  // 1) crea utente venue in Supabase Auth
  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);

  const venueUserId = created.user?.id;
  if (!venueUserId) throw new Error("auth_user_missing");

  // 2) crea venue
  const { data: venueData, error: venueError } = await supabase
    .from("venues")
    .insert({
      name,
      city,
      owner_user_id: venueUserId,
    })
    .select("id,name")
    .single();

  if (venueError) throw new Error(venueError.message);

  // 3) crea leaderboard entry
  // NB: nel tuo DB leaderboard_venues.id è TEXT e ci sono vecchi id tipo "v_mood".
  // Qui inseriamo SEMPRE l'UUID come stringa (coerente e futuro-proof).
  const { error: leaderboardError } = await supabase.from("leaderboard_venues").insert({
    id: String(venueData.id),
    name: venueData.name,
    score: 0,
    meta: `venue_uuid=${venueData.id}`,
  });

  if (leaderboardError) throw new Error(leaderboardError.message);

  return { venue_id: venueData.id };
}
