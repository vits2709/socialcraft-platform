import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  venue_id?: string;
  venueId?: string;
  slug?: string;
};

async function ensureUserRow(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  // Se hai una tabella "users" con FK su user_events.user_id, qui la garantiamo.
  // Se la tua tabella ha colonne diverse, dimmelo e la adatto al tuo schema.
  const { error } = await supabase
    .from("users")
    .upsert(
      { id: userId }, // minimo indispensabile
      { onConflict: "id" }
    );

  // Se la tabella users non esiste, non blocchiamo lo scan: ma tu mi devi dire
  // il nome tabella corretto (profiles/users ecc.). Qui però serve per la FK.
  if (error) {
    // Non crashare duro: ritorna errore chiaro
    throw new Error(`ensure_user_failed: ${error.message}`);
  }
}

async function resolveVenueIdBySlug(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  slug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function bumpLeaderboardUser(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  points: number
) {
  // 1) assicura riga
  const { error: upErr } = await supabase
    .from("leaderboard_users")
    .upsert({ id: String(userId), name: "utente", score: 0 }, { onConflict: "id" });

  if (upErr) throw new Error(upErr.message);

  // 2) increment “manuale” (safe enough per ora)
  const { data: row, error: selErr } = await supabase
    .from("leaderboard_users")
    .select("score")
    .eq("id", String(userId))
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);

  const current = Number(row?.score ?? 0);
  const next = current + points;

  const { error: updErr } = await supabase
    .from("leaderboard_users")
    .update({ score: next })
    .eq("id", String(userId));

  if (updErr) throw new Error(updErr.message);
}

async function bumpLeaderboardVenue(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  venueId: string,
  points: number
) {
  // leaderboard_venues.id nel tuo progetto spesso è TEXT (stringa).
  // Noi ci mettiamo SEMPRE String(venueId), così non litiga.
  const idText = String(venueId);

  // 1) assicura riga
  const { error: upErr } = await supabase
    .from("leaderboard_venues")
    .upsert({ id: idText, name: "venue", score: 0 }, { onConflict: "id" });

  if (upErr) throw new Error(upErr.message);

  // 2) increment “manuale”
  const { data: row, error: selErr } = await supabase
    .from("leaderboard_venues")
    .select("score")
    .eq("id", idText)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);

  const current = Number(row?.score ?? 0);
  const next = current + points;

  const { error: updErr } = await supabase
    .from("leaderboard_venues")
    .update({ score: next })
    .eq("id", idText);

  if (updErr) throw new Error(updErr.message);
}

export async function POST(req: Request) {
  // ✅ Next 16: cookies() è async
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });
  }

  const body: Body = await req.json().catch(() => ({} as Body));

  // accetta venue_id o venueId
  let venueId = String(body.venue_id ?? body.venueId ?? "").trim();
  const slug = String(body.slug ?? "").trim();

  const supabase = createSupabaseAdminClient();

  // ✅ se manca venueId ma c’è slug → risolviamo dal DB
  if (!venueId && slug) {
    const resolved = await resolveVenueIdBySlug(supabase, slug);
    if (!resolved) {
      return NextResponse.json({ ok: false, error: "venue_not_found_by_slug", slug }, { status: 404 });
    }
    venueId = String(resolved);
  }

  if (!venueId) {
    return NextResponse.json(
      { ok: false, error: "missing_venue_id", hint: "Send { venue_id } OR { slug }" },
      { status: 400 }
    );
  }

  // ✅ bootstrap riga utente per FK user_events.user_id
  try {
    await ensureUserRow(supabase, userId);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "ensure_user_failed" }, { status: 500 });
  }

  // 1) salva evento scan
  const { error: evErr } = await supabase.from("venue_events").insert({
    venue_id: venueId,
    user_id: userId,
    event_type: "scan",
  });

  if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });

  // 2) punti base scan
  const points = 2;

  const { error: ueErr } = await supabase.from("user_events").insert({
    user_id: userId,
    venue_id: venueId,
    event_type: "scan",
    points,
  });

  if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

  // 3) aggiorna leaderboard users + venues
  try {
    await bumpLeaderboardUser(supabase, userId, points);
    await bumpLeaderboardVenue(supabase, venueId, points);
  } catch (e: any) {
    // non blocchiamo la registrazione scan, ma segnaliamo problema leaderboard
    return NextResponse.json(
      {
        ok: true,
        venue_id: venueId,
        points,
        leaderboard_warning: e?.message ?? "leaderboard_update_failed",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, venue_id: venueId, points });
}