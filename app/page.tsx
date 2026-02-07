import { getVenueLeaderboard } from "@/lib/leaderboards";

export default async function Home() {
  const rows = await getVenueLeaderboard(100);

  return (
    <div>
      <h1 className="h1">Leaderboard Venue</h1>
      <p className="muted">Classifica basata su rating (media 1–5) + numero voti + visite (scan reali).</p>

      <div className="card">
        <div className="cardHead">
          <h2 className="h2">Top venue</h2>
          <span className="badge">
            <span className="dot" /> rating
          </span>
        </div>

        <table className="table" aria-label="Leaderboard venue">
          <thead>
            <tr>
              <th className="rank">#</th>
              <th>Venue</th>
              <th>Città</th>
              <th className="score">Rating</th>
              <th className="score">Visite</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="rank">{i + 1}</td>
                <td>
                  {r.name} {i === 0 ? <span className="badge top">🥇 Top</span> : null}
                  <div className="muted">Il voto è possibile solo via QR in sede.</div>
                </td>
                <td className="muted">{r.city ?? "—"}</td>
                <td className="score">
                  {Number(r.avg_rating).toFixed(2)} <span className="muted">({r.ratings_count})</span>
                </td>
                <td className="score">{Number(r.visits_count ?? 0).toLocaleString("it-IT")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <div className="notice" style={{ marginTop: 12 }}>
            Nessuna venue trovata. Crea almeno una venue in tabella <b>venues</b>.
          </div>
        ) : null}
      </div>
    </div>
  );
}
