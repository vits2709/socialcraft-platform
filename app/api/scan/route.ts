import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  slug?: string;
  venue_id?: string;
};

async function ensureScUser(supabase: any, userId: string) {
  // crea riga in sc_users se non esiste (per rispettare FK di user_events)
  // adattalo se la tua tabella sc_users ha più campi obbligatori
  const { error } = await supabase.from("sc_users").upsert(
    {
      id: userId,
      created_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
}

async function addPointsToLeaderboardUser(supabase: any, userId: string, points: number) {
  // increment sicuro: leggi score attuale e aggiorna
  const { data: existing, error: selErr } = await supabase
    .from("leaderboard_users")
    .select("id,score")
    .eq("id", String(userId))
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);

  if (!existing) {
    const { error: insErr } = await supabase.from("leaderboard_users").insert({
      id: String(userId),
      name: "utente",
      score: points,
      meta: null,
    });
    if (insErr) throw new Error(insErr.message);
    return;
  }

  const newScore = Number(existing.score ?? 0) + points;

  const { error: upErr } = await supabase
    .from("leaderboard_users")
    .update({ score: newScore })
    .eq("id", String(userId));

  if (upErr) throw new Error(upErr.message);
}

export async function POST(req: Request) {
  // Next 16: cookies() è async
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;

  if (!userId) {
    // con middleware non dovrebbe succedere
    return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({} as Body))) as Body;

  const slug = String(body?.slug ?? "").trim();
  const venueIdDirect = String(body?.venue_id ?? "").trim();

  if (!slug && !venueIdDirect) {
    return NextResponse.json({ ok: false, error: "missing_slug_or_venue_id" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // 0) risolvi venueId da slug (se presente)
  let venueId = venueIdDirect;

  if (!venueId && slug) {
    const { data: venue, error: vErr } = await supabase
      .from("venues")
      .select("id,slug")
      .eq("slug", slug)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    if (!venue) return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });

    venueId = String(venue.id);
  }

  // 1) assicurati che esista l’utente in sc_users (FK user_events)
  try {
    await ensureScUser(supabase, userId);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `ensure_sc_user_failed: ${e?.message ?? "unknown"}` }, { status: 500 });
  }

  // 2) salva evento scan su venue_events
  const { error: evErr } = await supabase.from("venue_events").insert({
    venue_id: venueId,
    user_id: userId,
    event_type: "scan",
  });

  if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });

  // 3) punti base scan
  const points = 2;

  // 4) salva su user_events
  const { error: ueErr } = await supabase.from("user_events").insert({
    user_id: userId,
    venue_id: venueId,
    event_type: "scan",
    points,
  });

  if (ueErr) {
    return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });
  }

  // 5) aggiorna leaderboard_users (increment reale)
  try {
    await addPointsToLeaderboardUser(supabase, userId, points);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `leaderboard_update_failed: ${e?.message ?? "unknown"}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    slug: slug || null,
    venue_id: venueId,
    user_id: userId,
    points,
  });
}