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
    const { slug } = await req.json().catch(() => ({} as any));
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

    // 2) user (explorer cookie)
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    // 3) 1/day check: esiste già uno scan oggi per questo venue?
    const since = startOfTodayISO();
    const { data: alreadyEv, error: aErr } = await supabase
      .from("user_events")
      .select("id")
      .eq("user_id", scUid)
      .eq("venue_id", venue.id)
      .eq("event_type", "scan")
      .gte("created_at", since)
      .limit(1);

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

    if (alreadyEv && alreadyEv.length > 0) {
      return NextResponse.json({
        ok: true,
        already: true,
        points: 0,
        message: "Presenza già registrata oggi ✅ Carica lo scontrino per guadagnare altri punti.",
      });
    }

    // 4) award points (scan)
    const points = 2;

    // ✅ usa SOLO event_type ammesso dal vincolo: "scan"
    const { error: ueErr } = await supabase.from("user_events").insert({
      user_id: scUid,
      venue_id: venue.id,
      event_type: "scan",
      points,
    });
    if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

    // evento spot (se vuoi tenerlo)
    const { error: veErr } = await supabase.from("venue_events").insert({
      venue_id: venue.id,
      user_id: scUid,
      event_type: "scan",
      points,
    });
    if (veErr) {
      // non blocchiamo tutto se venue_events fallisce
      console.warn("venue_events insert failed:", veErr.message);
    }

    // leaderboard increment: usa RPC esistenti (già in repo)
    // - increment_user_score_text è quello usato dalla tua scan route “vecchia”
    // - fallback su increment_user_score se presente
    let rpcOk = true;

    const { error: rpcErr1 } = await supabase.rpc("increment_user_score_text", {
      p_user_id_text: String(scUid),
      p_points: points,
    });

    if (rpcErr1) {
      const { error: rpcErr2 } = await supabase.rpc("increment_user_score", {
        p_user_id: scUid,
        p_points: points,
      });
      if (rpcErr2) {
        rpcOk = false;
        console.warn("RPC increment failed:", rpcErr1.message, rpcErr2.message);
      }
    }

    return NextResponse.json({
      ok: true,
      already: false,
      points,
      rpcOk,
      message: `Presenza registrata ✅ +${points} punti`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}