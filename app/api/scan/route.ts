import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const venueId = searchParams.get("v");

  if (!venueId) {
    return NextResponse.json({ error: "missing venue" }, { status: 400 });
  }

  const cookieStore = cookies();
  let userId = cookieStore.get("sc_uid")?.value;

  const supabase = createSupabaseAdminClient();

  // 1. crea utente se non esiste
  if (!userId) {
    const { data, error } = await supabase
      .from("sc_users")
      .insert({})
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    userId = data.id;

    cookieStore.set("sc_uid", userId, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // 2. registra evento utente
  await supabase.from("user_events").insert({
    user_id: userId,
    venue_id: venueId,
    event_type: "scan",
    points: 10,
  });

  // 3. registra evento venue
  await supabase.from("venue_events").insert({
    venue_id: venueId,
    event_type: "scan",
    user_id: userId,
  });

  // 4. aggiorna leaderboard utenti
  await supabase.rpc("increment_user_score", {
    p_user_id: userId,
    p_points: 10,
  });

  // 5. redirect alla pagina venue
  return NextResponse.redirect(new URL(`/venue/${venueId}`, req.url));
}