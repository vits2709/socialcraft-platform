import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function toInt(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

export async function POST(req: Request) {
  try {
    // cookie sc_uid (uuid)
    const cookieStore = await cookies();
    const userId = cookieStore.get("sc_uid")?.value;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const venueId = String(body?.venue_id ?? "").trim();
    const rating = toInt(body?.rating);

    if (!venueId) {
      return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    }
    if (!(rating >= 1 && rating <= 5)) {
      return NextResponse.json({ ok: false, error: "invalid_rating" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // 1) regola: puoi votare solo se hai uno scontrino APPROVATO oggi per questo spot
    const { data: canRate, error: canErr } = await supabase.rpc("can_rate_today", {
      p_user_id: userId,   // <-- se la tua funzione è uuid, passa uuid string (va bene)
      p_venue_id: venueId, // uuid string
    });

    if (canErr) {
      return NextResponse.json({ ok: false, error: `can_rate_failed:${canErr.message}` }, { status: 500 });
    }
    if (!canRate) {
      return NextResponse.json({ ok: false, error: "not_allowed_today" }, { status: 403 });
    }

    // 2) inserisci rating (1 al giorno per user/spot)
    const { error: insErr } = await supabase.from("spot_ratings").insert({
      user_id: userId,
      venue_id: venueId,
      rating,
      // day ha default now()::date
    });

    if (insErr) {
      // unique violation => già votato oggi
      const msg = (insErr as any)?.message?.toLowerCase?.() ?? "";
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("spot_ratings_one_per_day")) {
        return NextResponse.json({ ok: false, error: "already_rated_today" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: `insert_failed:${insErr.message}` }, { status: 500 });
    }

    // 3) aggiorna cache rating su venues (se hai columns avg_rating / ratings_count)
    // Se non esistono, questa parte fallirebbe: quindi la faccio "best effort".
    const { data: agg } = await supabase
      .from("spot_ratings")
      .select("rating, venue_id")
      .eq("venue_id", venueId);

    if (Array.isArray(agg) && agg.length > 0) {
      const sum = agg.reduce((a, r: any) => a + Number(r.rating ?? 0), 0);
      const count = agg.length;
      const avg = count ? sum / count : 0;

      await supabase
        .from("venues")
        .update({
          avg_rating: avg,
          ratings_count: count,
        })
        .eq("id", venueId);
      // NB: se la tabella venues non ha queste colonne, Supabase ti darebbe errore:
      // in quel caso dimmelo e lo facciamo con una VIEW o con una RPC.
    }

    return NextResponse.json({ ok: true, venue_id: venueId, rating });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}