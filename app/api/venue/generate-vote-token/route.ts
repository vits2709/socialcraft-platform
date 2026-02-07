import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVenueByOwner } from "@/lib/auth";

export async function POST() {
  const supabase = await createSupabaseServerClient();
}


  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const venue = await getVenueByOwner(user.id);
  if (!venue) return NextResponse.json({ error: "no_venue" }, { status: 404 });

  const { data, error } = await supabase.rpc("create_vote_token", {
    p_venue_id: venue.id,
    p_ttl_seconds: 120,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ token: data, venueId: venue.id });
}
