import { createClient } from "@supabase/supabase-js";
import { getVenueDetails } from "@/lib/leaderboards";

export default async function RateVenuePage({
  params,
  searchParams,
}: {
  params: { venueId: string };
  searchParams: { t?: string };
}) {
  const venue = await getVenueDetails(params.venueId);
  const token = searchParams.t;

  if (!venue) {
    return (
      <div className="card">
        <h2 className="h2">Venue non trovata</h2>
        <p className="muted">Controlla l'ID oppure crea la venue in Supabase.</p>
      </div>
    );
  }

  // ✅ Visita reale: se c'è token, proviamo a marcarlo come "opened"
  if (token) {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (url && anon) {
      const supabase = createClient(url, anon, { auth: { persistSession: false } });
      await supabase.rpc("mark_token_opened", {
        p_venue_id: params.venueId,
        p_token: token,
      });
      // Se token è scaduto/usato, la funzione non incrementa nulla.
    }
  }

  if (!token) {
    return (
      <div className="card">
        <h1 className="h1" style={{ marginBottom: 6 }}>
          {venue.name}
        </h1>
        <p className="muted">{venue.city ?? "—"}</p>
        <div className="notice" style={{ marginTop: 12 }}>
          Voto non disponibile. Devi <b>scansionare il QR in sede</b> per ottenere un token valido (scade in 2 minuti).
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card">
        <h1 className="h1" style={{ marginBottom: 6 }}>
          {venue.name}
        </h1>
        <p className="muted">
          {venue.city ?? "—"} • Rating attuale: <b>{Number(venue.avg_rating).toFixed(2)}</b> ({venue.ratings_count} voti) •
          Visite: <b>{Number(venue.visits_count ?? 0).toLocaleString("it-IT")}</b>
        </p>

        <div className="notice" style={{ margin: "12px 0" }}>
          Token valido per pochi secondi: invia subito il voto. (Monouso)
        </div>

        <form action={`/rate/${venue.id}/submit`} method="post">
          <input type="hidden" name="token" value={token} />

          <label className="label">Voto</label>
          <select className="select" name="rating" defaultValue="" required>
            <option value="" disabled>Seleziona un voto</option>
            <option value="1">⭐ 1 – Pessimo</option>
            <option value="2">⭐⭐ 2 – Scarso</option>
            <option value="3">⭐⭐⭐ 3 – Nella media</option>
            <option value="4">⭐⭐⭐⭐ 4 – Buono</option>
            <option value="5">⭐⭐⭐⭐⭐ 5 – Top</option>
          </select>

          <label className="label">Nota (facoltativa)</label>
          <input className="input" name="note" placeholder="es. cocktail ottimi, servizio veloce..." />

          <div style={{ height: 12 }} />
          <button className="btn btnPrimary" type="submit">
            Invia voto
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="h2">Info</h2>
        <p className="muted">Se il voto fallisce, probabilmente il token è scaduto/usato: scansiona di nuovo il QR.</p>
      </div>
    </div>
  );
}
