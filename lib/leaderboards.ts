import { createSupabaseServerAnonClient } from "@/lib/supabase/server_anon";

export type VenueLeaderboardRow = {
  id: string;
  name: string;
  city: string | null;
  avg_rating: number;
  ratings_count: number;
  visits_count: number;
};

export async function getVenueLeaderboard(limit = 100): Promise<VenueLeaderboardRow[]> {
  const supabase = createSupabaseServerAnonClient();

  const { data, error } = await supabase
    .from("venue_leaderboard")
    .select("id,name,city,avg_rating,ratings_count,visits_count")
    .order("avg_rating", { ascending: false })
    .order("ratings_count", { ascending: false })
    .order("visits_count", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as VenueLeaderboardRow[];
}

export async function getVenueDetails(venueId: string): Promise<VenueLeaderboardRow | null> {
  const supabase = createSupabaseServerAnonClient();

  const { data, error } = await supabase
    .from("venue_leaderboard")
    .select("id,name,city,avg_rating,ratings_count,visits_count")
    .eq("id", venueId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as VenueLeaderboardRow | null;
}
