import { headers } from "next/headers";

type Row = { id: string; name: string; score: number; meta?: string };

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function getRows(): Promise<Row[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/leaderboard/users`, { cache: "no-store" });
  if (!res.ok) throw new Error("Fetch users failed");
  return res.json();
}

export default async function UsersLeaderboard() {
  const rows = await getRows();

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h2 className="h2">Leaderboard Utenti (tutte)</h2>
          <div className="muted">Ordinata per score decrescente</div>
        </div>
        <span className="badge"><span className="dot" /> users</span>
      </div>

      <table className="table" aria-label="Leaderboard utenti completa">
        <thead>
          <tr>
            <th className="rank">#</th>
            <th>Utente</th>
            <th>Badge</th>
            <th className="score">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className="rank">{i + 1}</td>
              <td>{r.name}</td>
              <td className="muted">{r.meta ?? "—"}</td>
              <td className="score">{r.score.toLocaleString("it-IT")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
