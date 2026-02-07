import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserLeaderboardRow = {
  user_id: string;
  points: number;
  scans: number;
  votes: number;
  last_activity: string | null;
};

export async function getUserLeaderboard(limit = 50): Promise<UserLeaderboardRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_user_leaderboard", {
    p_limit: limit,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as UserLeaderboardRow[];
}
