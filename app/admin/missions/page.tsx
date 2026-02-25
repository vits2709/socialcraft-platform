import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import MissionsAdminClient from "./MissionsAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMissionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  const supabase = createSupabaseAdminClient();

  const [missionsRes, countsRes, venuesRes] = await Promise.all([
    supabase
      .from("missions")
      .select("*")
      .order("type")
      .order("created_at", { ascending: false }),

    supabase
      .from("user_missions")
      .select("mission_id")
      .not("completed_at", "is", null),

    supabase
      .from("venues")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const countMap: Record<string, number> = {};
  for (const row of countsRes.data ?? []) {
    const key = (row as { mission_id: string }).mission_id;
    countMap[key] = (countMap[key] ?? 0) + 1;
  }

  const missions = (missionsRes.data ?? []).map((m) => ({
    ...m,
    completions_count: countMap[m.id] ?? 0,
  }));

  return (
    <MissionsAdminClient
      initialMissions={missions}
      venues={(venuesRes.data ?? []) as { id: string; name: string }[]}
    />
  );
}
