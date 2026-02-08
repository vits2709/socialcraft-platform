import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));

  const venueIdRaw = String(body?.venue_id ?? "").trim();
  const slug = String(body?.slug ?? "").trim();

  if (!venueIdRaw && !slug) {
    return NextResponse.json({ ok: false, error: "missing_venue_id_or_slug" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // 1) Risolvi venue_id: se arriva slug, lo cerchiamo in venues
  let venueId: string | null = venueIdRaw || null;

  if (!venueId && slug) {
    const { data: v, error } = await supabase
      .from("venues")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!v) return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });

    venueId = String(v.id);
  }

  if (!venueId) {
    return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });
  }

  // 2) Salva evento scan
  const { error: evErr } = await supabase.from("venue_events").insert({
    venue_id: venueId,
    user_id: userId,
    event_type: "scan",
  });

  if (evErr) {
    // Se ti capita FK error qui, vuol dire che user_id non esiste nella tabella users/profiles (vedi nota sotto)
    return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });
  }

  // 3) Punti base scan
  const points = 2;

  const { error: ueErr } = await supabase.from("user_events").insert({
    user_id: userId,
    venue_id: venueId,
    event_type: "scan",
    points,
  });

  if (ueErr) {
    return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });
  }

  // 4) Leaderboard USERS: increment atomico via RPC
  const { error: incUserErr } = await supabase.rpc("increment_user_points", {
    p_user_id: String(userId),
    p_points: points,
    p_name: "utente",
  });

  if (incUserErr) {
    return NextResponse.json({ ok: false, error: `increment_user_points_failed: ${incUserErr.message}` }, { status: 500 });
  }

  // 5) Leaderboard VENUES: increment atomico via RPC (scan=+1)
  const { error: incVenueErr } = await supabase.rpc("increment_venue_scans", {
    p_venue_id: venueId,
    p_points: 1,
  });

  if (incVenueErr) {
    return NextResponse.json({ ok: false, error: `increment_venue_scans_failed: ${incVenueErr.message}` }, { status: 500 });
  }

  // 6) Revalida pagine leaderboard (così vedi subito l’update)
  revalidatePath("/");
  revalidatePath("/admin"); // opzionale
  // se hai una pagina /leaderboard ecc, aggiungila qui

  return NextResponse.json({ ok: true, venue_id: venueId, points });
}