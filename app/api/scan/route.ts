import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    // 1) venue by slug
    const { data: venue, error: vErr } = await supabase
      .from("venues")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    if (!venue) return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });

    // 2) explorer user (cookie)
    const uid = req.cookies.get("sc_uid")?.value?.trim();
    if (!uid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    // 3) ✅ 1/day check: already scanned today for this venue?
    const since = startOfTodayISO();
    const { data: already, error: aErr } = await supabase
      .from("user_events")
      .select("id")
      .eq("user_id", uid)
      .eq("venue_id", venue.id)
      .eq("event_type", "scan")
      .gte("created_at", since)
      .limit(1);

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

    if (already && already.length > 0) {
      return NextResponse.json({
        ok: true,
        already: true,
        points: 0,
        message: "Presenza già registrata oggi ✅ Carica lo scontrino per guadagnare altri punti.",
      });
    }

    // 4) award +2 (schema compatibile)
    const points = 2;

    // a) venue_events (serve per upload scontrino: controllo scan recente)
    const { error: veErr } = await supabase.from("venue_events").insert({
      venue_id: venue.id,
      event_type: "scan",
      points,
      user_id: uid,
    });
    if (veErr) return NextResponse.json({ ok: false, error: veErr.message }, { status: 500 });

    // b) user_events (serve per profilo/punti/statistiche)
    const { error: ueErr } = await supabase.from("user_events").insert({
      user_id: uid,
      venue_id: venue.id,
      event_type: "scan",
      points,
    });
    if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

    // c) leaderboard_users (score)
    // (se la tabella non ha name, lascia solo score; qui uso update/insert semplice)
    const { data: lbUser, error: lbReadErr } = await supabase
      .from("leaderboard_users")
      .select("id, score")
      .eq("id", uid)
      .maybeSingle();

    if (!lbReadErr) {
      if (lbUser) {
        const { error: lbUpErr } = await supabase
          .from("leaderboard_users")
          .update({ score: Number(lbUser.score ?? 0) + points })
          .eq("id", uid);
        if (lbUpErr) return NextResponse.json({ ok: false, error: lbUpErr.message }, { status: 500 });
      } else {
        const { error: lbInsErr } = await supabase.from("leaderboard_users").insert({
          id: uid,
          score: points,
        });
        if (lbInsErr) return NextResponse.json({ ok: false, error: lbInsErr.message }, { status: 500 });
      }
    }

    // d) rpc (se esiste, meglio: non deve rompere se manca)
    await supabase.rpc("increment_user_score_text", {
      p_user_id: uid,
      p_points: points,
      p_name: null,
    });

    return NextResponse.json({
      ok: true,
      already: false,
      points,
      message: `Presenza registrata ✅ +${points} punti`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}