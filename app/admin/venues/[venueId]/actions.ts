"use server";

import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createPromoAction(venueId: string, formData: FormData) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const promo_type = String(formData.get("promo_type") ?? "generic").trim();
  if (!title) throw new Error("missing_title");

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("venue_promos")
    .insert({
      venue_id: venueId,
      title,
      description: description || null,
      promo_type,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { error: e2 } = await supabase.rpc("set_active_promo", {
    p_venue_id: venueId,
    p_promo_id: data.id,
  });
  if (e2) throw new Error(e2.message);
}

export async function setActivePromoAction(venueId: string, promoId: string) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("set_active_promo", {
    p_venue_id: venueId,
    p_promo_id: promoId,
  });
  if (error) throw new Error(error.message);
}

export async function deactivatePromoAction(promoId: string) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("venue_promos").update({ is_active: false }).eq("id", promoId);
  if (error) throw new Error(error.message);
}
