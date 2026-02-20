import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bestActivePromo, applyPromoBonus, type PromoSchedule } from "@/lib/promo-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AWARD_VERIFIED = 2;   // geo verificato (entro 100m)
const AWARD_UNVERIFIED = 1; // GPS negato → check-in permesso ma con 1 punto solo

function todayISODate() {
  // YYYY-MM-DD in timezone server (ok per regola "1 al giorno")
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) {
      return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = String(body?.slug ?? "").trim();
    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }

    // geo_verified: true (dentro 100m) → +2pt | false (GPS negato) → +1pt | undefined → +2pt (compat)
    const geoVerified: boolean = body?.geo_verified !== false;
    const AWARD = geoVerified ? AWARD_VERIFIED : AWARD_UNVERIFIED;

    // 1) trova venue
    const { data: venue, error: vErr } = await supabase
      .from("venues")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    if (!venue) return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });

    // 2) carica utente (punti reali stanno qui)
    const { data: user, error: uErr } = await supabase
      .from("sc_users")
      .select("id, name, points")
      .eq("id", scUid)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    if (!user) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

    const day = todayISODate();

    // 3) check "1 al giorno" (PER VENUE)
    // user_events non ha colonna "day", quindi filtriamo su created_at (range giorno)
    const start = `${day}T00:00:00.000Z`;
    const end = `${day}T23:59:59.999Z`;

    const { count: alreadyCount, error: aErr } = await supabase
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", scUid)
      .eq("venue_id", venue.id)
      .eq("event_type", "scan")
      .gte("created_at", start)
      .lte("created_at", end);

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

    const already = (alreadyCount ?? 0) > 0;
    if (already) {
      return NextResponse.json({
        ok: true,
        already: true,
        points_awarded: 0,
        total_points: Number(user.points ?? 0),
        message: "Presenza già registrata oggi ✅",
      });
    }

    // 4) controlla promo attive per questo spot
    const { data: promoRows } = await supabase
      .from("venue_promos")
      .select("id,title,is_active,bonus_type,bonus_value,days_of_week,time_start,time_end,date_start,date_end")
      .eq("venue_id", venue.id)
      .eq("is_active", true);

    const promo = bestActivePromo((promoRows ?? []) as PromoSchedule[], AWARD);
    const finalPoints = promo ? applyPromoBonus(AWARD, promo) : AWARD;

    // 5) aggiorna punti su sc_users (UNICA fonte verità)
    const newTotal = Number(user.points ?? 0) + finalPoints;

    const { error: upErr } = await supabase
      .from("sc_users")
      .update({ points: newTotal, updated_at: new Date().toISOString() })
      .eq("id", scUid);

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    // 6) log evento utente (event_type valido: scan/vote/receipt)
    const { error: ueErr } = await supabase.from("user_events").insert({
      user_id: scUid,
      venue_id: venue.id,
      event_type: "scan",
      points: finalPoints,
      points_delta: finalPoints,
      geo_verified: geoVerified,
    });

    if (ueErr) {
      // non blocchiamo l’utente se il log fallisce,
      // ma meglio segnalare errore per debug
      return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });
    }

    // 7) log evento venue — non bloccante: i punti sono già assegnati
    const { error: veErr } = await supabase.from("venue_events").insert({
      venue_id: venue.id,
      user_id: scUid,
      event_type: "scan",
    });
    if (veErr) console.error("venue_events insert failed:", veErr.message);

    return NextResponse.json({
      ok: true,
      already: false,
      geo_verified: geoVerified,
      points_awarded: finalPoints,
      points_base: AWARD,
      promo: promo
        ? { id: promo.id, title: promo.title, bonus_type: promo.bonus_type, bonus_value: Number(promo.bonus_value) }
        : null,
      total_points: newTotal,
      message: promo
        ? `Presenza registrata ✅ +${finalPoints} punti (promo: ${promo.title})`
        : geoVerified
        ? `Presenza registrata ✅ +${finalPoints} punti`
        : `Presenza registrata ✅ +${finalPoints} punto (GPS non verificato)`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}