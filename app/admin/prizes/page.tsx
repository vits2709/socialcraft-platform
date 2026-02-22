import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import PrizesAdminClient from "./PrizesAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type VenueOption = { id: string; name: string };

type PrizeRow = {
  id: string;
  week_start: string;
  prize_description: string;
  prize_image: string | null;
  spot_id: string | null;
  winner_user_id: string | null;
  winner_name: string | null;
  winner_assigned_at: string | null;
  redemption_code: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
  venues: { id: string; name: string } | null;
};

export default async function AdminPrizesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const supabase = createSupabaseAdminClient();

  const [prizesRes, venuesRes] = await Promise.all([
    supabase
      .from("weekly_prizes")
      .select("id,week_start,prize_description,prize_image,spot_id,winner_user_id,winner_name,winner_assigned_at,redemption_code,redeemed,redeemed_at,venues(id,name)")
      .order("week_start", { ascending: false })
      .limit(20),

    supabase
      .from("venues")
      .select("id,name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const prizes = (prizesRes.data ?? []) as unknown as PrizeRow[];
  const venues = (venuesRes.data ?? []) as VenueOption[];

  return (
    <PrizesAdminClient
      initialPrizes={prizes}
      venues={venues}
    />
  );
}
