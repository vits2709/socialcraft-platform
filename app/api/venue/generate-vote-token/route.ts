import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getVenueByOwner } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return NextResponse.json({ error: "missing_env" }, { status: 500 });
    }

    // ✅ Route Handler: leggiamo i cookie direttamente dalla request (NO next/headers cookies())
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll() {
          // NO-OP: qui non serve settare cookie per generare token
        },
      },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 401 });
    }

    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const venue = await getVenueByOwner(user.id);
    if (!venue) {
      return NextResponse.json({ error: "no_venue" }, { status: 404 });
    }

    const { data, error } = await supabase.rpc("create_vote_token", {
      p_venue_id: venue.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ token: data, venueId: venue.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}