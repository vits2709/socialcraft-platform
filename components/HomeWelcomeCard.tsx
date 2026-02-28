import Link from "next/link";
import { getExplorerLevel } from "@/lib/levels";

type Props = {
  username: string | null;
  totalPoints: number;
  weeklyRank: number | null;
  isLoggedIn: boolean;
};

export default function HomeWelcomeCard({ username, totalPoints, weeklyRank, isLoggedIn }: Props) {
  const cardStyle: React.CSSProperties = {
    borderRadius: 18,
    padding: "18px 20px",
    background: "linear-gradient(135deg, #2D1B69 0%, #7BC043 100%)",
    boxShadow: "0 4px 18px rgba(45,27,105,0.18)",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

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
    marginTop: 2,
  };

  if (!isLoggedIn) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, opacity: 0.7 }}>CityQuest</div>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.2 }}>
          Esplora la città, scala la classifica! 🏆
        </div>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
          Registrati e guadagna punti visitando gli spot in città.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/signup" style={{ ...ctaStyle, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.4)" }}>
            Inizia ora →
          </Link>
          <Link href="/login" style={{ ...ctaStyle, background: "rgba(255,255,255,0.10)" }}>
            Accedi
          </Link>
        </div>
      </div>
    );
  }

  const level = getExplorerLevel(totalPoints);
  const displayName = username ? username.split(" ")[0] : "Esploratore";

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, opacity: 0.7 }}>CityQuest</div>

      <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.2 }}>
        Ciao {displayName}! 👋
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.14)", borderRadius: 10, padding: "6px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, opacity: 0.65 }}>CLASS. SETT.</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 1 }}>
            {weeklyRank != null ? `#${weeklyRank}` : "—"}
          </div>
        </div>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.14)", borderRadius: 10, padding: "6px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, opacity: 0.65 }}>PUNTI TOTALI</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 1 }}>{totalPoints}</div>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {level.current.emoji} {level.current.name}
          </div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>
            {level.next ? `${level.toNext} pt → ${level.next.name}` : "Livello max 👑"}
          </div>
        </div>
        <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            borderRadius: 999,
            background: "rgba(255,255,255,0.88)",
            width: `${level.progress}%`,
          }} />
        </div>
      </div>

      <Link href="/me" style={ctaStyle}>Il mio profilo →</Link>
    </div>
  );
}
