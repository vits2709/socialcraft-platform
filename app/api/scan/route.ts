import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ScanBody = {
  venue_id?: string;
  slug?: string;
};

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const supabase = createSupabaseAdminClient();

  // 1) cookie sc_uid (utente anonimo)
  const cookieStore = await cookies();
  let userId = cookieStore.get("sc_uid")?.value;

  // Se non esiste, creiamolo e settalo
  let res: NextResponse | null = null;
  if (!userId) {
    userId = crypto.randomUUID();
    res = NextResponse.json({ ok: true, created_uid: true, user_id: userId });
    res.cookies.set("sc_uid", userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 anno
    });
  }

  // 2) body
  const body = (await req.json().catch(() => ({}))) as ScanBody;
  const venueIdRaw = String(body?.venue_id ?? "").trim();
  const slugRaw = String(body?.slug ?? "").trim();

  // 3) risolvi venue_id (priorità: venue_id, altrimenti slug)
  let venueId: string | null = venueIdRaw || null;

  if (!venueId && slugRaw) {
    const { data: v, error: vErr } = await supabase
      .from("venues")
      .select("id")
      .eq("slug", slugRaw)
      .maybeSingle();

    if (vErr) return jsonError(vErr.message, 500);
    if (!v?.id) return jsonError("venue_not_found_for_slug", 404);
    venueId = String(v.id);
  }

  if (!venueId) {
    // Se avevamo già creato cookie response, rendiamola errore coerente
    return NextResponse.json({ ok: false, error: "missing_venue_id_or_slug" }, { status: 400 });
  }

  // 4) ensure sc_users (tabella anonimi)
  // NB: deve esistere public.sc_users come da SQL sopra
  {
    const { error: ensureErr } = await supabase.from("sc_users").upsert(
      { id: userId, name: "utente" },
      { onConflict: "id" }
    );

    if (ensureErr) return jsonError(`ensure_sc_user_failed: ${ensureErr.message}`, 500);
  }

  // 5) salva evento scan
  const { error: evErr } = await supabase.from("venue_events").insert({
    venue_id: venueId,
    user_id: userId,
    event_type: "scan",
  });
  if (evErr) return jsonError(evErr.message, 500);

  // 6) punti scan
  const points = 2;

  const { error: ueErr } = await supabase.from("user_events").insert({
    user_id: userId,
    venue_id: venueId,
    event_type: "scan",
    points,
  });
  if (ueErr) return jsonError(ueErr.message, 500);

  // 7) leaderboard users (increment)
  // Se non hai ancora la function increment_user_score(uuid,int), puoi creare la versione che usa leaderboard_users.id uuid.
  try {
    await supabase.rpc("increment_user_score", {
      p_user_id: userId,
      p_points: points,
    });
  } catch {
    // non blocchiamo lo scan
  }

  // 8) leaderboard venues (increment) - function che abbiamo creato sopra
  try {
    await supabase.rpc("increment_venue_score_uuid", {
      p_venue_id: venueId,
      p_points: points,
    });
  } catch (e) {
    // se vuoi, puoi loggare server-side, ma non blocchiamo
  }

  // 9) risposta finale (se avevamo già creato res per cookie, riusiamola)
  if (res) {
    // era una response "created_uid", ma vogliamo restituire anche esito scan
    return NextResponse.json({
      ok: true,
      created_uid: true,
      user_id: userId,
      venue_id: venueId,
      points,
    }, {
      headers: res.headers,
    });
  }

  return NextResponse.json({ ok: true, user_id: userId, venue_id: venueId, points });
}