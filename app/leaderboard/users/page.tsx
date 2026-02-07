import { getUserLeaderboard } from "@/lib/users";

function shortId(id: string) {
  return id.slice(0, 8);
}

export default async function UsersLeaderboardPage() {
  const rows = await getUserLeaderboard(50);

  return (
    <div>
      <h1 className="h1">Leaderboard Utenti</h1>
      <p className="muted">Punti: scan in sede (+1) • voto valido (+2)</p>

      <div className="card">
        <div className="cardHead">
          <h2 className="h2">Top users</h2>
          <span className="badge">
            <span className="dot" /> points
          </span>
        </div>

        <table className="table" aria-label="Leaderboard users">
          <thead>
            <tr>
              <th className="rank">#</th>
              <th>User</th>
              <th className="score">Punti</th>
              <th className="score">Scan</th>
              <th className="score">Voti</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u, i) => (
              <tr key={u.user_id}>
                <td className="rank">{i + 1}</td>
                <td>
                  <span className="badge">UID: {shortId(u.user_id)}</span>
                  <div className="muted">Anonimo (cookie)</div>
                </td>
                <td className="score">{Number(u.points ?? 0).toLocaleString("it-IT")}</td>
                <td className="score">{Number(u.scans ?? 0).toLocaleString("it-IT")}</td>
                <td className="score">{Number(u.votes ?? 0).toLocaleString("it-IT")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <div className="notice" style={{ marginTop: 12 }}>
            Nessuna attività utenti ancora. Appena scansionano un QR e votano, qui si popola.
          </div>
        ) : null}
      </div>
    </div>
  );
}
