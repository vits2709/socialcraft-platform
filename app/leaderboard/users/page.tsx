type Row = { id: string; name: string; score: number; meta?: string };

async function getRows(): Promise<Row[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/leaderboard/users`, { cache: "no-store" });
  if (!res.ok) throw new Error("Fetch users failed");
  return res.json();
}

export default async function UsersLeaderboard() {
  const rows = await getRows();

  return (
    <div className="card">
      <h2 className="h2">Leaderboard Utenti (tutte)</h2>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Utente</th>
            <th>Badge</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td>{r.name}</td>
              <td>{r.meta ?? "—"}</td>
              <td>{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
