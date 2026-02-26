import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import AdminNotificationsClient from "./AdminNotificationsClient";

export default async function AdminNotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(user.id))) redirect("/");

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("user_notifications")
    .select("id,user_id,type,title,body,read,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <h1 style={{ fontWeight: 900, fontSize: 22, marginBottom: 20 }}>
        📢 Notifiche Admin
      </h1>
      <AdminNotificationsClient initial={data ?? []} />
    </div>
  );
}
