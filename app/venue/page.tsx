import { redirect } from "next/navigation";
import { getSessionUser, getVenueByOwner, isAdmin } from "@/lib/auth";
import { getVenueDetails } from "@/lib/leaderboards";
import GenerateVoteToken from "@/app/venue/GenerateVoteToken";

export default async function VenueDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (await isAdmin(user.id)) redirect("/admin");

  const venue = await getVenueByOwner(user.id);
  if (!venue) {
    return (
      <div className="card">
        <h2 className="h2">Nessuna venue associata</h2>
        <p className="muted">
          Questo account non è collegato a nessuna venue. Crea una riga in tabella <b>venues</b> con <b>owner_user_id</b> =
          questo user id.
        </p>
        <div className="notice">User ID: {user.id}</div>
      </div>
    );
  }

  const stats = await getVenueDetails(venue.id);

  return (
    <div className="grid">
      <div className="card">
        <h1 className="h1" style={{ marginBottom: 6 }}>
          Dashboard Venue
        </h1>
        <p className="muted">
          Sei loggato come: <b>{user.email}</b>
        </p>

        <div className="notice" style={{ marginTop: 12 }}>
          <div>
            <b>Venue:</b> {venue.name}
          </div>
          <div>
            <b>ID:</b> {venue.id}
          </div>
          <div>
            <b>Città:</b> {venue.city ?? "—"}
          </div>
        </div>

        <div style={{ height: 12 }} />
        <GenerateVoteToken venueId={venue.id} />

        <div style={{ height: 12 }} />
        <div className="btnRow">
          <a className="btn" href="/">
            Torna alla leaderboard
          </a>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Statistiche</h2>
        <p className="muted">Rating + visite (scan reali).</p>

        <div className="notice">
          <div>
            <b>Rating medio:</b> {stats ? Number(stats.avg_rating).toFixed(2) : "—"}
          </div>
          <div>
            <b>Numero voti:</b> {stats ? stats.ratings_count : "—"}
          </div>
          <div>
            <b>Visite:</b> {stats ? Number(stats.visits_count ?? 0).toLocaleString("it-IT") : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
