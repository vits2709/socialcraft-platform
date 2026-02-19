import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOLDOWN_DAYS = 7;

function cooldownSince() {
  return new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function nextVoteAt(lastVoteIso: string): string {
  return new Date(new Date(lastVoteIso).getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// GET /api/checkin/vote?venue_id=xxx
// Controlla se l'utente può votare (cooldown 7 giorni)
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("sc_uid")?.value?.trim();
    if (!userId) {
      return NextResponse.json({ canVote: false, error: "not_logged" }, { status: 401 });
    }

    const venueId = new URL(req.url).searchParams.get("venue_id")?.trim();
    if (!venueId) {
      return NextResponse.json({ canVote: false, error: "missing_venue_id" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: lastVote } = await supabase
      .from("spot_ratings")
      .select("created_at")
      .eq("user_id", userId)
      .eq("venue_id", venueId)
      .gte("created_at", cooldownSince())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastVote) {
      return NextResponse.json({ canVote: false, nextVoteAt: nextVoteAt(lastVote.created_at) });
    }

    return NextResponse.json({ canVote: true });
  } catch (e: any) {
    return NextResponse.json({ canVote: false, error: e?.message }, { status: 500 });
  }
}

// POST /api/checkin/vote
// Invia voto (non richiede scontrino approvato, solo cooldown 7 giorni)
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("sc_uid")?.value?.trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const venueId = String(body?.venue_id ?? "").trim();
    const rating = Number(body?.rating);

    if (!venueId) {
      return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    }
    if (!(rating >= 1 && rating <= 5)) {
      return NextResponse.json({ ok: false, error: "invalid_rating" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Verifica cooldown 7 giorni lato server
    const { data: lastVote } = await supabase
      .from("spot_ratings")
      .select("created_at")
      .eq("user_id", userId)
      .eq("venue_id", venueId)
      .gte("created_at", cooldownSince())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastVote) {
      return NextResponse.json(
        { ok: false, error: "vote_cooldown", nextVoteAt: nextVoteAt(lastVote.created_at) },
        { status: 429 }
      );
    }

    // Inserisci voto
    const { error: insErr } = await supabase.from("spot_ratings").insert({
      user_id: userId,
      venue_id: venueId,
      rating,
    });

    if (insErr) {
      const msg = insErr.message.toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return NextResponse.json({ ok: false, error: "already_voted_today" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    // Aggiorna cache rating su venues (best effort)
    const { data: agg } = await supabase
      .from("spot_ratings")
      .select("rating")
      .eq("venue_id", venueId);

    if (Array.isArray(agg) && agg.length > 0) {
      const sum = agg.reduce((a: number, r: any) => a + Number(r.rating ?? 0), 0);
      await supabase
        .from("venues")
        .update({ avg_rating: sum / agg.length, ratings_count: agg.length })
        .eq("id", venueId);
    }

    // Marca voted=true nel user_event scan di oggi (best effort)
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from("user_events")
      .update({ voted: true })
      .eq("user_id", userId)
      .eq("venue_id", venueId)
      .eq("event_type", "scan")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lte("created_at", `${today}T23:59:59.999Z`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
