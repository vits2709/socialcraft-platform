import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { deleteUserAction } from "./actions";
import DeleteUserButton from "@/components/DeleteUserButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LBUser = {
  id: string;
  name: string | null;
  score: number | null;
  meta?: string | null;
};

export default async function AdminUsersPage() {
  const u = await getSessionUser();
  if (!u) redirect("/admin/login");
  if (!(await isAdmin(u.id))) redirect("/venue");

  const supabase = await createSupabaseServerClientReadOnly();

  const { data: users, error: uErr } = await supabase
    .from("leaderboard_users")
    .select("id,name,score,meta")
    .order("score", { ascending: false })
    .limit(500);

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Admin · Users
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Vista globale utenti (da leaderboard_users). Eliminazione con conferma.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className="btn" href="/admin">
            ← Admin
          </Link>
        </div>
      </div>

      {uErr ? (
        <div className="notice">Errore users: {uErr.message}</div>
      ) : (
        <table className="table" aria-label="Admin users">
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th>Nome</th>
              <th className="score">Punti</th>
              <th style={{ textAlign: "right" }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((row: LBUser, i: number) => (
              <tr key={row.id}>
                <td className="rank">{i + 1}</td>
                <td>
                  <b>{row.name ?? "Guest"}</b>
                  <div className="muted">ID: {row.id}</div>
                  {row.meta ? <div className="muted">{row.meta}</div> : null}
                </td>
                <td className="score">{Number(row.score ?? 0).toLocaleString("it-IT")}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <form action={deleteUserAction.bind(null, row.id)}>
                    <DeleteUserButton userName={row.name ?? row.id} />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(users ?? []).length === 0 ? (
        <div className="notice" style={{ marginTop: 12 }}>
          Nessun utente in leaderboard_users.
        </div>
      ) : null}
    </div>
  );
}