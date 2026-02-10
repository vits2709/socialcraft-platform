import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SessionUser = { id: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();

  // ✅ priorità admin
  const adminId = cookieStore.get("sc_admin_uid")?.value?.trim();
  if (adminId) return { id: adminId };

  // ✅ fallback explorer
  const uid = cookieStore.get("sc_uid")?.value?.trim();
  if (uid) return { id: uid };

  return null;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.user_id);
}