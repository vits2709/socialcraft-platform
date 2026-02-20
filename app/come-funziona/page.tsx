import Link from "next/link";

export const metadata = {
  title: "Come funziona | CityQuest",
  description: "Esplora la tua città, guadagna punti e vinci premi reali.",
};

const STEPS = [
  {
    icon: "📷",
    num: "01",
    title: "Scannerizza il QR",
    text: "Entra in uno spot e scannerizza il QR code con il telefono. Sei nel posto giusto!",
  },
  {
    icon: "⭐",
    num: "02",
    title: "Guadagna Punti",
    text: "Ogni visita vale punti. Carica lo scontrino per guadagnarne ancora di più. Vota il locale per contribuire alla community.",
  },
  {
    icon: "🏆",
    num: "03",
    title: "Scala la Classifica",
    text: "Accumula punti, sblocca badge comuni, rari, epici e leggendari. Scopri missioni segrete e sfida gli altri esploratori.",
  },
  {
    icon: "🎁",
    num: "04",
    title: "Vinci Premi Reali",
    text: "Ogni settimana i migliori esploratori vincono premi offerti dagli spot. Più esplori, più vinci.",
  },
];

const BADGES = [
  {
    icon: "✨",
    name: "Primo Scan",
    rarity: "Comune",
    border: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    color: "#1d4ed8",
    secret: false,
  },
  {
    icon: "🧭",
    name: "Esploratore",
    rarity: "Raro",
    border: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    color: "#6d28d9",
    secret: false,
  },
  {
    icon: "🗺️",
    name: "Giro Lungo",
    rarity: "Epico",
    border: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    color: "#c2410c",
    secret: false,
  },
  {
    icon: "🌙",
    name: "???",
    rarity: "Leggendario",
    border: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    color: "#b91c1c",
    secret: true,
    hint: "Il silenzio delle notti di fila racconta storie...",
  },
];

export default function ComeFunzionaPage() {
  return (
    <div className="page">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 24,
          background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
          padding: "52px 24px 44px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CityQuest" style={{ height: 72, width: 72, borderRadius: 18 }} />
        </div>
        <h1
          style={{
            margin: "0 0 14px",
            fontSize: "clamp(28px, 7vw, 44px)",
            fontWeight: 950,
            letterSpacing: -0.5,
            lineHeight: 1.1,
          }}
        >
          Come funziona CityQuest
        </h1>
        <p
          style={{
            margin: "0 auto 32px",
            fontSize: 17,
            opacity: 0.92,
            maxWidth: 440,
            lineHeight: 1.6,
          }}
        >
          Esplora la tua città, guadagna punti e vinci premi reali
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            className="btn primary"
            href="/login"
            style={{
              background: "#fff",
              color: "#6366f1",
              fontWeight: 900,
              padding: "14px 28px",
              fontSize: 16,
              border: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            }}
          >
            Registrati gratis →
          </Link>
          <Link
            className="btn"
            href="/login"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.45)",
              fontWeight: 700,
              padding: "14px 28px",
              fontSize: 16,
            }}
          >
            Accedi
          </Link>
        </div>
      </div>

      {/* ── 4 Step ───────────────────────────────────────────────────────────── */}
      <div className="card">
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, letterSpacing: -0.2 }}>
          In 4 semplici step
        </h2>
        <p className="muted" style={{ margin: "0 0 24px", fontSize: 14 }}>
          Bastano pochi minuti per iniziare a guadagnare punti
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {STEPS.map((s) => (
            <div
              key={s.num}
              style={{
                borderRadius: 18,
                border: "1.5px solid rgba(99,102,241,0.15)",
                background: "rgba(99,102,241,0.03)",
                padding: "22px 18px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: -6,
                  right: 10,
                  fontSize: 76,
                  fontWeight: 950,
                  color: "rgba(99,102,241,0.06)",
                  lineHeight: 1,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                {s.num}
              </div>
              <div style={{ fontSize: 42, marginBottom: 14 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 8 }}>{s.title}</div>
              <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Badge ────────────────────────────────────────────────────────────── */}
      <div className="card">
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, letterSpacing: -0.2 }}>
          🏅 Sblocca badge e scopri missioni segrete
        </h2>
        <p className="muted" style={{ margin: "0 0 22px", fontSize: 14, lineHeight: 1.6 }}>
          Ogni badge ha una rarità — da Comune a Leggendario. Alcuni sono segreti: dovrai scoprirli esplorando!
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          {BADGES.map((b) => (
            <div
              key={b.name}
              style={{
                borderRadius: 16,
                border: `2px solid ${b.border}`,
                background: b.bg,
                padding: "18px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 38, marginBottom: 10 }}>
                {b.secret ? "🔐" : b.icon}
              </div>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
                {b.name}
              </div>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 999,
                  background: `${b.border}22`,
                  color: b.color,
                }}
              >
                {b.rarity}
              </span>
              {"hint" in b && b.hint && (
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 11,
                    color: b.color,
                    fontStyle: "italic",
                    opacity: 0.8,
                    lineHeight: 1.5,
                  }}
                >
                  {b.hint}
                </p>
              )}
            </div>
          ))}
        </div>

        <p
          className="muted"
          style={{ margin: "18px 0 0", fontSize: 13, textAlign: "center", fontStyle: "italic" }}
        >
          23 badge da sbloccare — inizia il tuo viaggio!
        </p>
      </div>

      {/* ── Promo ────────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 22,
          background: "linear-gradient(135deg, rgba(251,146,60,0.10), rgba(239,68,68,0.06))",
          border: "2px solid rgba(251,146,60,0.3)",
          padding: "24px 20px",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, letterSpacing: -0.2 }}>
          🔥 Approfitta delle promo degli spot
        </h2>
        <p className="muted" style={{ margin: "0 0 22px", fontSize: 14, lineHeight: 1.6 }}>
          Gli spot attivano promozioni speciali con punti bonus in determinate fasce orarie.
          Tieni d&apos;occhio la home per non perderne una.
        </p>

        {/* Card promo mockup */}
        <div
          style={{
            borderRadius: 20,
            background: "linear-gradient(135deg, #fff7ed, #fff)",
            border: "2px solid rgba(251,146,60,0.4)",
            padding: "18px 20px",
            maxWidth: 280,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>🍸</span>
            <span style={{ fontWeight: 950, fontSize: 14 }}>Bar del Centro</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#c2410c" }}>
            Happy Hour — Punti doppi!
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #fb923c, #ef4444)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              alignSelf: "flex-start",
            }}
          >
            🔥 x2 punti
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>⏱</span>
            <span>Scade tra 45 min</span>
          </div>
        </div>
      </div>

      {/* ── Per i locali ─────────────────────────────────────────────────────── */}
      <div className="card soft">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900 }}>
              🏪 Sei un locale? Unisciti a CityQuest
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, maxWidth: 400 }}>
              Porta nuovi clienti, fidelizza quelli esistenti e monitora le statistiche del tuo locale in tempo reale.
            </p>
          </div>
          <Link className="btn" href="mailto:info@cityquest.it" style={{ flexShrink: 0 }}>
            Scopri come →
          </Link>
        </div>
      </div>

      {/* ── CTA finale ───────────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 24,
          background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
          padding: "44px 24px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 16 }}>🚀</div>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: "clamp(24px, 5vw, 36px)",
            fontWeight: 950,
            letterSpacing: -0.3,
          }}
        >
          Pronto a esplorare?
        </h2>
        <p
          style={{
            margin: "0 auto 32px",
            opacity: 0.92,
            fontSize: 16,
            maxWidth: 360,
            lineHeight: 1.6,
          }}
        >
          Registrati gratis e inizia subito a guadagnare punti
        </p>
        <Link
          className="btn"
          href="/login"
          style={{
            background: "#fff",
            color: "#6366f1",
            fontWeight: 900,
            padding: "16px 40px",
            fontSize: 17,
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          }}
        >
          Inizia ora →
        </Link>
      </div>

    </div>
  );
}
