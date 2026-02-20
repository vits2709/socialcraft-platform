"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type OrariGiorno = { apertura: string; chiusura: string; chiuso: boolean };
type OrariData = Record<string, OrariGiorno>;

export type UpdateSpotData = {
  indirizzo?: string;
  telefono?: string;
  sito_web?: string;
  categoria?: string;
  fascia_prezzo?: number | null;
  servizi?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  orari?: OrariData;
  foto?: string[];
  cover_image?: string | null;
  instagram?: string | null;
  facebook?: string | null;
};

export async function updateSpotAction(venueId: string, data: UpdateSpotData) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/admin");

  const supabase = createSupabaseAdminClient();

  // Fetch current venue to get lat/lng/indirizzo for fallback
  const { data: current } = await supabase
    .from("venues")
    .select("lat,lng,indirizzo")
    .eq("id", venueId)
    .maybeSingle();

  let lat: number | null = current?.lat ?? null;
  let lng: number | null = current?.lng ?? null;

  // Geocoding via Nominatim if indirizzo changed
  if (data.indirizzo && data.indirizzo !== (current?.indirizzo ?? "")) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(data.indirizzo)}&format=json&limit=1`,
        { headers: { "User-Agent": "CityQuest/1.0" } }
      );
      const json = await res.json();
      const [r] = json as Array<{ lat: string; lon: string }>;
      if (r) {
        lat = parseFloat(r.lat);
        lng = parseFloat(r.lon);
      }
    } catch {
      // Keep previous lat/lng on failure — not a blocking error
    }
  }

  const { error } = await supabase
    .from("venues")
    .update({
      indirizzo: data.indirizzo ?? null,
      telefono: data.telefono ?? null,
      sito_web: data.sito_web ?? null,
      categoria: data.categoria ?? null,
      fascia_prezzo: data.fascia_prezzo ?? null,
      servizi: data.servizi ?? [],
      is_active: data.is_active ?? true,
      is_featured: data.is_featured ?? false,
      orari: data.orari ?? null,
      foto: data.foto ?? [],
      cover_image: data.cover_image ?? null,
      instagram: data.instagram ?? null,
      facebook: data.facebook ?? null,
      lat,
      lng,
    })
    .eq("id", venueId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/venues/${venueId}`);
  revalidatePath(`/admin/venues/${venueId}/edit`);
  revalidatePath(`/v`);
}
