import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — spot owner valida un codice riscatto
// Body: { code: string }
export async function POST(req: NextRequest) {
  // Solo spot owner autenticati via Supabase Auth
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  // Trova il venue dell'owner
  const { data: venue, error: venueErr } = await supabase
    .from("venues")
    .select("id,name")
    .eq("owner_user_id", sessionUser.id)
    .maybeSingle();

  if (venueErr) return NextResponse.json({ ok: false, error: venueErr.message }, { status: 500 });
  if (!venue) return NextResponse.json({ ok: false, error: "no_venue" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });

  // Cerca il premio con questo codice per il venue dello spot owner
  const { data: prize, error: prizeErr } = await supabase
    .from("weekly_prizes")
    .select("id,prize_description,winner_user_id,winner_name,redeemed,redeemed_at,redemption_code_expires_at,week_start,spot_id")
    .eq("redemption_code", code)
    .maybeSingle();

  if (prizeErr) return NextResponse.json({ ok: false, error: prizeErr.message }, { status: 500 });
  if (!prize) return NextResponse.json({ ok: false, error: "code_not_found" }, { status: 404 });

  // Verifica che il premio sia per questo spot
  if (prize.spot_id !== venue.id) {
    return NextResponse.json({ ok: false, error: "code_not_for_this_venue" }, { status: 403 });
  }

  if (prize.redeemed) {
    return NextResponse.json({
      ok: false,
      error: "already_redeemed",
      redeemed_at: prize.redeemed_at,
    }, { status: 409 });
  }

  // Controlla scadenza
  if (prize.redemption_code_expires_at && new Date(prize.redemption_code_expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: "code_expired" }, { status: 410 });
  }

  // Segna come riscattato
  const { error: updateErr } = await supabase
    .from("weekly_prizes")
    .update({ redeemed: true, redeemed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", prize.id);

  if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });

  // Notifica al vincitore che il premio è stato riscattato
  if (prize.winner_user_id) {
    await supabase.from("user_notifications").insert({
      user_id: prize.winner_user_id,
      type: "prize_redeemed",
      title: "🎉 Premio riscattato!",
      body: `Il tuo premio "${prize.prize_description}" è stato riscattato presso ${venue.name}.`,
      data: { prize_id: prize.id, venue_name: venue.name },
    });
  }

  return NextResponse.json({
    ok: true,
    prize_description: prize.prize_description,
    winner_name: prize.winner_name,
    week_start: prize.week_start,
  });
}
