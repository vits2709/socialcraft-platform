import Link from "next/link";

type Mission = {
  emoji: string;
  title: string;
  description: string;
  points_reward: number;
};

type Props = {
  mission: Mission | null;
  isLoggedIn: boolean;
};

export default function HomeMissionCard({ mission, isLoggedIn }: Props) {
  const ctaStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 14px",
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 700,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    textDecoration: "none",
    alignSelf: "flex-start",
  };

  return (
    <div style={{
      borderRadius: 18,
      padding: "18px 20px",
      background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
      boxShadow: "0 4px 18px rgba(29,78,216,0.15)",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, opacity: 0.7 }}>Ogni giorno</div>
      <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: -0.2 }}>🎯 Missione del giorno</div>

      {mission ? (
        <>
          <div style={{
            background: "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            padding: "10px 12px",
          }}>
            <div style={{ fontSize: 22, marginBottom: 5 }}>{mission.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, lineHeight: 1.25 }}>
              {mission.title}
            </div>
            <div style={{ fontSize: 12, opacity: 0.78, lineHeight: 1.45 }}>
              {mission.description}
            </div>
          </div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.14)",
            borderRadius: 999,
            padding: "4px 10px",
            fontWeight: 700,
            fontSize: 12,
            alignSelf: "flex-start",
          }}>
            🏅 +{mission.points_reward} pt
          </div>
          <Link href="/me" style={ctaStyle}>Vai alle missioni →</Link>
        </>
      ) : (
        <>
          <div style={{
            background: "rgba(255,255,255,0.1)",
            border: "1.5px dashed rgba(255,255,255,0.28)",
            borderRadius: 12,
            padding: "14px 12px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>🎯</div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
              {isLoggedIn ? "Nessuna missione attiva" : "Missioni giornaliere"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.45 }}>
              {isLoggedIn
                ? "Le nuove missioni vengono assegnate ogni giorno."
                : "Registrati e guadagna punti completando sfide quotidiane."}
            </div>
          </div>
          <Link href={isLoggedIn ? "/me" : "/login"} style={ctaStyle}>
            {isLoggedIn ? "Vai al profilo →" : "Inizia ora →"}
          </Link>
        </>
      )}
    </div>
  );
}
