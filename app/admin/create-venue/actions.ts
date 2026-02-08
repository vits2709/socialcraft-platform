"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";

function mustStr(fd: FormData, key: string) {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) throw new Error(`missing_${key}`);
  return v;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove accenti
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function ensureUniqueVenueSlug(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  base: string
) {
  const baseSlug = base || "venue";

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;

    const { data, error } = await supabase
      .from("venues")
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return candidate;
  }

  return `${baseSlug}-${Date.now()}`;
}

export async function createVenueAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const name = mustStr(formData, "name");
  const city = mustStr(formData, "city");
  const email = mustStr(formData, "email");
  const password = mustStr(formData, "password");

  const supabase = createSupabaseAdminClient();

  // 0) slug name-city (unico)
  const baseSlug = slugify(`${name}-${city}`);
  const slug = await ensureUniqueVenueSlug(supabase, baseSlug);

  // 1) crea utente venue in Supabase Auth
  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);

  const venueUserId = created.user?.id;
  if (!venueUserId) throw new Error("auth_user_missing");

  // 2) crea venue (con slug)
  const { data: venueData, error: venueError } = await supabase
    .from("venues")
    .insert({
      name,
      city,
      slug,
      owner_user_id: venueUserId,
    })
    .select("id,name,slug")
    .single();

  if (venueError) throw new Error(venueError.message);

  // 3) crea leaderboard entry
  // NB: leaderboard_venues.id è TEXT → inseriamo UUID come stringa.
  const { error: leaderboardError } = await supabase.from("leaderboard_venues").insert({
    id: String(venueData.id),
    name: venueData.name,
    score: 0,
    meta: `venue_uuid=${venueData.id};slug=${venueData.slug}`,
  });

  if (leaderboardError) throw new Error(leaderboardError.message);

  // aggiorna cache + vai subito alla gestione venue
  revalidatePath("/admin");
  redirect(`/admin/venues/${venueData.id}`);
}