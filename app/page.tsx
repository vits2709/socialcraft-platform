import Link from "next/link";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import HomeLeaderboards from "@/components/HomeLeaderboards";
import HomeScannerCTA from "@/components/HomeScannerCTA";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type LBRow = {
  id: string;
  name: string | null;
  score: number | null;
  meta?: string | null;
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClientReadOnly();

  const [{ data: spots, error: sErr }, { data: explorers, error: eErr }] = await Promise.all([
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
    <div className="page">
      {/* HERO */}
      <div className="hero card">
        <div className="heroTop">
          <div>
            <h1 className="heroTitle">SocialCraft</h1>
            <p className="heroSubtitle">
              Scala la classifica degli <b>Esploratori</b> e fai salire gli <b>Spot</b>.
            </p>
          </div>

          {/* ✅ CTA: aggiunto Scanner (senza rompere animazioni/leaderboard) */}
          <div className="heroCtas">
            <HomeScannerCTA />

            <Link className="btn primary" href="/me">
              Il mio profilo
            </Link>

            <Link className="btn" href="/login">
              Accedi
            </Link>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="howGrid">
          <div className="howCard">
            <div className="howIcon">📍</div>
            <div className="howBody">
              <div className="howTitle">Scansiona il QR dello Spot</div>
              <div className="howText">Registra la visita e guadagni punti subito.</div>
            </div>
          </div>

          <div className="howCard">
            <div className="howIcon">🧑‍🚀</div>
            <div className="howBody">
              <div className="howTitle">Diventa un Esploratore leggendario</div>
              <div className="howText">Sblocca livelli goliardici e badge (in arrivo).</div>
            </div>
          </div>

          <div className="howCard">
            <div className="howIcon">🔥</div>
            <div className="howBody">
              <div className="howTitle">Fai salire lo Spot</div>
              <div className="howText">Ogni scan aiuta lo Spot a scalare la classifica.</div>
            </div>
          </div>
        </div>

        {(sErr || eErr) && (
          <div className="notice" style={{ marginTop: 10 }}>
            {sErr ? <div>Errore Spot: {sErr.message}</div> : null}
            {eErr ? <div>Errore Esploratori: {eErr.message}</div> : null}
          </div>
        )}
      </div>

      {/* LEADERBOARDS (tabs mobile + 2col desktop) */}
      <HomeLeaderboards spots={(spots ?? []) as LBRow[]} explorers={(explorers ?? []) as LBRow[]} />

      {/* FOOT NOTES */}
      <div className="card soft" style={{ marginTop: 14 }}>
        <div className="softRow">
          <div>
            <div className="softTitle">Sei uno Spot?</div>
            <div className="softText">Accedi come Spot e gestisci promo, stats e QR dalla dashboard.</div>
          </div>
          <Link className="btn" href="/venue">
            Dashboard Spot →
          </Link>
        </div>
      </div>
    </div>
  );
}