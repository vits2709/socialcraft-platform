type Row = { id: string; name: string; score: number; meta?: string };

async function getRows(): Promise<Row[]> {
  const res = await fetch("/api/leaderboard/venues", { cache: "no-store" });
  if (!res.ok) throw new Error("Fetch venues failed");
  return res.json();
}

export default async function VenuesLeaderboard() {
  const rows = await getRows();

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h2 className="h2">Leaderboard Venue (tutte)</h2>
          <div className="muted">Ordinata per score decrescente</div>
        </div>
        <span className="badge"><span className="dot" /> venues</span>
      </div>

      <table className="table" aria-label="Leaderboard venue completa">
        <thead>
          <tr>
            <th className="rank">#</th>
            <th>Venue</th>
            <th>Zona</th>
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
