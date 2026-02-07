import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createVenueAction } from "./actions";

export default async function CreateVenuePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(user.id))) redirect("/venue");

  return (
    <div className="card">
      <div className="cardHead">
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Crea nuova venue
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Crea account venue + venue + inserimento leaderboard.
          </p>
        </div>

        <Link className="btn" href="/admin">
          ← Admin
        </Link>
      </div>

      <form action={createVenueAction} className="form" style={{ marginTop: 12 }}>
        <label className="label">Nome venue</label>
        <input name="name" className="input" placeholder="es. Mood" required />

        <label className="label">Città</label>
        <input name="city" className="input" placeholder="es. Vasto" required />

        <label className="label">Email login venue</label>
        <input name="email" type="email" className="input" placeholder="es. mood@socialcraft.it" required />

        <label className="label">Password temporanea</label>
        <input name="password" type="password" className="input" required />

        <div style={{ height: 12 }} />
        <button className="btn btnPrimary" type="submit">
          Crea venue
        </button>
      </form>

      <div className="notice" style={{ marginTop: 12 }}>
        Dopo la creazione puoi fare login con l’account venue e aprire <b>/venue</b>.
      </div>
    </div>
  );
}
