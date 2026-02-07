import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  const u = data.user;
  if (!u) return null;
  return { id: u.id, email: u.email ?? null };
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClientReadOnly();

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.user_id;
}

export async function getVenueByOwner(userId: string) {
  const supabase = await createSupabaseServerClientReadOnly();

  const { data, error } = await supabase
    .from("venues")
    .select("id,name,city,owner_user_id")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}
