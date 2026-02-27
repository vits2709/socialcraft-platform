import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import UsersAdminClient, { type UserRow } from "./UsersAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUsersPage() {
  const u = await getSessionUser();
  if (!u) redirect("/admin/login");
  if (!(await isAdmin(u.id))) redirect("/venue");

  const supabase = await createSupabaseServerClientReadOnly();

  const { data: users, error } = await supabase
    .from("leaderboard_users")
    .select("id,name,score,meta")
    .order("score", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div className="notice">Errore caricamento utenti: {error.message}</div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
          👥 Utenti
        </h1>
        <p style={{ margin: "4px 0 0", color: "rgba(15,23,42,0.5)", fontSize: 13 }}>
          {(users ?? []).length} utenti in classifica
        </p>
      </div>

      <UsersAdminClient users={(users ?? []) as UserRow[]} />
    </div>
  );
}
