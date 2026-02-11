import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json().catch(() => ({} as any));

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "missing_slug" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // 1. trova venue
    const { data: venue, error: venueErr } = await supabase
      .from("venues")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (venueErr) {
      return NextResponse.json(
        { ok: false, error: venueErr.message },
        { status: 500 }
      );
    }

    if (!venue) {
      return NextResponse.json(
        { ok: false, error: "venue_not_found" },
        { status: 404 }
      );
    }

    // 2. utente da cookie
    const scUid = req.cookies.get("sc_uid")?.value?.trim();

    if (!scUid) {
      return NextResponse.json(
        { ok: false, error: "not_logged" },
        { status: 401 }
      );
    }

    // 3. trova utente
    const { data: user, error: userErr } = await supabase
      .from("sc_users")
      .select("id, points")
      .eq("id", scUid)
      .maybeSingle();

    if (userErr) {
      return NextResponse.json(
        { ok: false, error: userErr.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "profile_missing" },
        { status: 404 }
      );
    }

    // 4. assegna punti
    const pointsAward = 2;

    const { error: updateErr } = await supabase
      .from("sc_users")
      .update({
        points: (user.points || 0) + pointsAward,
      })
      .eq("id", user.id);

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      points_awarded: pointsAward,
      message: `Presenza registrata ✅ +${pointsAward} punti`,
    });

  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 }
    );
  }
}