import { headers } from "next/headers";

type Row = {
  id: string;
  name: string;
  score: number;
  meta?: string;
};

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

function LeaderboardTable({ rows, label }: { rows: Row[]; label: string }) {
  return (
    <table className="table" aria-label={label}>
      <thead>
        <tr>
          <th className="rank">#</th>
          <th>Nome</th>
          <th>Info</th>
          <th className="score">Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id}>
            <td className="rank">{i + 1}</td>
            <td>
              {r.name} {i === 0 ? <span className="badge top">🥇 Top</span> : null}
            </td>
            <td className="muted">{r.meta ?? "—"}</td>
            <td className="score">{r.score.toLocaleString("it-IT")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function Home() {
  const base = getBaseUrl();

  const [venues, users] = await Promise.all([
    getJSON<Row[]>(`${base}/api/leaderboard/venues`),
    getJSON<Row[]>(`${base}/api/leaderboard/users`),
  ]);

  return (
    <div>
      <h1 className="h1">Leaderboards</h1>
      <p className="muted">
        Classifiche di test (mock API). Quando vuoi, le colleghiamo a Supabase.
      </p>

      <div className="grid">
        <section className="card">
          <div className="cardHead">
            <h2 className="h2">Venue</h2>
            <a className="btn" href="/leaderboard/venues">Vedi tutto →</a>
          </div>
          <LeaderboardTable rows={venues.slice(0, 10)} label="Leaderboard venue" />
        </section>

        <section className="card">
          <div className="cardHead">
            <h2 className="h2">Utenti</h2>
            <a className="btn" href="/leaderboard/users">Vedi tutto →</a>
          </div>
          <LeaderboardTable rows={users.slice(0, 10)} label="Leaderboard utenti" />
        </section>
      </div>
    </div>
  );
}
