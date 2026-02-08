"use server";

import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createPromoAction(venueId: string, formData: FormData) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  // ✅ evita crash se chiamata male (formData undefined)
  if (!formData || typeof (formData as any).get !== "function") {
    throw new Error("missing_formdata");
  }

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

  const promoId = data?.id;
  if (!promoId) throw new Error("promo_id_missing");

  const { error: e2 } = await supabase.rpc("set_active_promo", {
    p_venue_id: venueId,
    p_promo_id: promoId,
  });
  if (e2) throw new Error(e2.message);

  return { ok: true, promo_id: promoId };
}

export async function setActivePromoAction(venueId: string, promoId: string) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  if (!venueId) throw new Error("missing_venue_id");
  if (!promoId) throw new Error("missing_promo_id");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("set_active_promo", {
    p_venue_id: venueId,
    p_promo_id: promoId,
  });
  if (error) throw new Error(error.message);

  return { ok: true };
}

export async function deactivatePromoAction(promoId: string) {
  const user = await getSessionUser();
  if (!user || !(await isAdmin(user.id))) throw new Error("not_allowed");

  if (!promoId) throw new Error("missing_promo_id");

  const supabase = createSupabaseAdminClient();

  // (opzionale ma utile) capiamo venue_id della promo, per pulire active promo se serve
  const { data: promoRow, error: promoReadErr } = await supabase
    .from("venue_promos")
    .select("id, venue_id")
    .eq("id", promoId)
    .maybeSingle();

  if (promoReadErr) throw new Error(promoReadErr.message);

  const { error } = await supabase
    .from("venue_promos")
    .update({ is_active: false })
    .eq("id", promoId);

  if (error) throw new Error(error.message);

  // ✅ se quella promo era attiva, la disattiviamo anche nella tabella “active promo”
  if (promoRow?.venue_id) {
    await supabase.rpc("set_active_promo", {
      p_venue_id: promoRow.venue_id,
      p_promo_id: null,
    });
  }

  return { ok: true };
}