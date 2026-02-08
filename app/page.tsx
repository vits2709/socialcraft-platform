export const dynamic = "force-dynamic";
import Link from "next/link";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LBRow = {
  id: string;
  name: string | null;
  score: number | null;
  meta?: string | null;
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClientReadOnly();

  const [{ data: venues, error: vErr }, { data: users, error: uErr }] = await Promise.all([
    supabase
      .from("leaderboard_venues")
      .select("id,name,score,meta")
      .order("score", { ascending: false })
      .limit(200),
    supabase
      .from("leaderboard_users")
      .select("id,name,score,meta")
      .order("score", { ascending: false })
      .limit(200),
  ]);

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Leaderboard
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Venues + Users
          </p>
        </div>
      </div>

      {/* VENUES */}
      <section style={{ marginTop: 12 }}>
        <div className="notice" style={{ marginBottom: 12 }}>
          <b>Venues</b>
        </div>

        {vErr ? (
          <div className="notice">Errore venues: {vErr.message}</div>
        ) : (
          <table className="table" aria-label="Leaderboard venues">
            <thead>
              <tr>
                <th className="rank">#</th>
                <th>Nome</th>
                <th className="score">Score</th>
                <th style={{ textAlign: "right" }}>Apri</th>
              </tr>
            </thead>
            <tbody>
              {(venues ?? []).map((v: LBRow, i: number) => {
                const slugMatch = String(v.meta ?? "").match(/slug=([a-z0-9-]+)/i);
                const slug = slugMatch?.[1] ?? null;

                return (
                  <tr key={v.id}>
                    <td className="rank">{i + 1}</td>
                    <td>
                      <b>{v.name ?? "—"}</b>
                      <div className="muted">ID: {v.id}</div>
                      {slug ? <div className="muted">slug: {slug}</div> : null}
                    </td>
                    <td className="score">{Number(v.score ?? 0).toLocaleString("it-IT")}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {slug ? (
                        <Link className="btn" href={`/v/${slug}`} target="_blank">
                          Apri
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* USERS */}
      <section id="users" style={{ marginTop: 18 }}>
        <div className="notice" style={{ marginBottom: 12 }}>
          <b>Users</b>
        </div>

        {uErr ? (
          <div className="notice">Errore users: {uErr.message}</div>
        ) : (
          <table className="table" aria-label="Leaderboard users">
            <thead>
              <tr>
                <th className="rank">#</th>
                <th>Utente</th>
                <th className="score">Score</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u: LBRow, i: number) => (
                <tr key={u.id}>
                  <td className="rank">{i + 1}</td>
                  <td>
                    <b>{u.name ?? "utente"}</b>
                    <div className="muted">ID: {u.id}</div>
                  </td>
                  <td className="score">{Number(u.score ?? 0).toLocaleString("it-IT")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}