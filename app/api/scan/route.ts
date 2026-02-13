import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = body?.slug;

    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // utente loggato
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
    }

    // profilo sc_users
    const { data: scUser, error: userErr } = await supabase
      .from("sc_users")
      .select("id, points")
      .eq("id", user.id)
      .single();

    if (userErr || !scUser) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    // venue
    const { data: venue, error: venueErr } = await supabase
      .from("venues")
      .select("id")
      .eq("slug", slug)
      .single();

    if (venueErr || !venue) {
      return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // controlla se già fatto scan oggi
    const { data: existing } = await supabase
      .from("user_events")
      .select("id")
      .eq("user_id", scUser.id)
      .eq("venue_id", venue.id)
      .eq("event_type", "scan")
      .gte("created_at", today + "T00:00:00");

    if (existing && existing.length > 0) {
      return NextResponse.json({
        ok: true,
        already: true,
        points_awarded: 0,
        total_points: scUser.points,
        message: "Presenza già registrata oggi",
      });
    }

    // aggiorna punti
    const newPoints = scUser.points + 2;

    const { error: updErr } = await supabase
      .from("sc_users")
      .update({ points: newPoints })
      .eq("id", scUser.id);

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    // inserisci evento
    await supabase.from("user_events").insert({
      user_id: scUser.id,
      venue_id: venue.id,
      event_type: "scan",
      points: 2,
      points_delta: 2,
    });

    return NextResponse.json({
      ok: true,
      already: false,
      points_awarded: 2,
      total_points: newPoints,
      message: "Presenza registrata ✅ +2 punti",
    });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}