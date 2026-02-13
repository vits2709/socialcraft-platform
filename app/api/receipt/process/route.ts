import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const url = new URL(req.url);
    const id = (url.searchParams.get("id") ?? "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

    const { data: ver, error: vErr } = await supabase
      .from("receipt_verifications")
      .select("id,user_id,venue_id,status,reason")
      .eq("id", id)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    if (!ver) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Se non approved, ritorniamo lo stato
    if (ver.status !== "approved") {
      return NextResponse.json({
        ok: true,
        status: ver.status,
        reason: ver.reason ?? null,
      });
    }

    // ✅ Se approved: assegna +8 UNA SOLA VOLTA
    const receiptPoints = 8;

    // check se già accreditato (usiamo points_delta=8 + venue_id + user_id + "receipt")
    const { data: already, error: aErr } = await supabase
      .from("user_events")
      .select("id")
      .eq("user_id", ver.user_id)
      .eq("venue_id", ver.venue_id)
      .eq("event_type", "receipt")
      .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()) // finestra 30g (ok)
      .limit(200);

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

    // euristica: se esiste già un receipt event con points_delta=8 "recent", non riaccreditare
    const alreadyCredited = (already ?? []).length > 0;

    if (!alreadyCredited) {
      // load user points
      const { data: user, error: uErr } = await supabase
        .from("sc_users")
        .select("id, points, name")
        .eq("id", ver.user_id)
        .maybeSingle();

      if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
      if (!user) return NextResponse.json({ ok: false, error: "profile_missing" }, { status: 404 });

      const current = Number(user.points ?? 0);
      const newTotal = current + receiptPoints;

      // update sc_users
      const { error: upErr } = await supabase.from("sc_users").update({ points: newTotal }).eq("id", user.id);
      if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

      // user_events (receipt)
      const { error: ueErr } = await supabase.from("user_events").insert({
        user_id: user.id,
        venue_id: ver.venue_id,
        event_type: "receipt",
        points: newTotal,
        points_delta: receiptPoints,
      });
      if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

      // leaderboard_users
      const displayName = (user.name ?? "Guest").toString();
      const { error: lbErr } = await supabase.from("leaderboard_users").upsert(
        {
          id: user.id,
          name: displayName,
          score: newTotal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (lbErr) return NextResponse.json({ ok: false, error: lbErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "approved", reason: ver.reason ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}