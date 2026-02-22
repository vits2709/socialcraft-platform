"use client";

import { useState, useCallback } from "react";

const RARITY_EXAMPLES = [
  { icon: "✨", name: "Primo Scan", rarity: "Comune", border: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  { icon: "🧭", name: "Esploratore", rarity: "Raro", border: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { icon: "💥", name: "Inarrestabile", rarity: "Epico", border: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  { icon: "👑", name: "La Leggenda", rarity: "Leggendario", border: "#facc15", bg: "rgba(250,204,21,0.12)" },
];

type Props = { destination: string };

export default function OnboardingClient({ destination }: Props) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const TOTAL = 4;

  const complete = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await fetch("/api/auth/onboarding-complete", { method: "POST" });
    } finally {
      window.location.assign(destination);
    }
  }, [completing, destination]);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(145deg, #2D1B69 0%, #4a2fa8 50%, #7BC043 100%)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px 0",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="CityQuest" style={{ height: 36, width: 36, borderRadius: 10, opacity: 0.9 }} />

        {/* Salta — visibile dalla schermata 2 in poi */}
        {step > 0 ? (
          <button
            onClick={complete}
            disabled={completing}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              borderRadius: 20,
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Salta
          </button>
        ) : (
          <div style={{ width: 60 }} />
        )}
      </div>

      {/* Slides container */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 28px",
              transform: `translateX(${(i - step) * 100}%)`,
              transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "transform",
            }}
          >
            {i === 0 && <SlideWelcome />}
            {i === 1 && <SlidePoints />}
            {i === 2 && <SlideBadges />}
            {i === 3 && <SlidePrizes />}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "12px 0",
          flexShrink: 0,
        }}
      >
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div
            key={i}
            onClick={() => setStep(i)}
            style={{
              width: step === i ? 22 : 8,
              height: 8,
              borderRadius: 4,
              background: step === i ? "#fff" : "rgba(255,255,255,0.35)",
              transition: "all 300ms",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div
        style={{
          padding: "8px 28px 40px",
          display: "grid",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {step === 0 && (
          <button onClick={next} style={btnPrimary}>
            Inizia →
          </button>
        )}

        {step > 0 && step < TOTAL - 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <button onClick={prev} style={btnSecondary}>
              ← Indietro
            </button>
            <button onClick={next} style={btnPrimary}>
              Avanti →
            </button>
          </div>
        )}

        {step === TOTAL - 1 && (
          <>
            <button onClick={prev} style={{ ...btnSecondary, marginBottom: 0 }}>
              ← Indietro
            </button>
            <button onClick={complete} disabled={completing} style={btnPrimary}>
              {completing ? "Un momento..." : "Inizia a esplorare! 🚀"}
            </button>
            <button
              onClick={complete}
              disabled={completing}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                cursor: "pointer",
                padding: "4px",
                textAlign: "center",
              }}
            >
              Salta
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Slide components ─────────────────────────────────────────────────────────

function SlideWelcome() {
  return (
    <div style={slideContent}>
      <div style={emojiStyle}>🏆</div>
      <h1 style={titleStyle}>Benvenuto su CityQuest!</h1>
      <p style={subtitleStyle}>Esplora la tua città, guadagna punti e vinci premi reali.</p>
      <p style={bodyStyle}>
        CityQuest è il gioco urbano che ti premia per uscire di casa e scoprire i migliori posti della tua città.
      </p>
    </div>
  );
}

function SlidePoints() {
  const items = [
    { icon: "📷", text: "Scannerizza il QR nello spot", points: "+2 punti" },
    { icon: "🧾", text: "Carica lo scontrino", points: "+8 punti" },
    { icon: "⭐", text: "Vota il locale", points: "community" },
  ];

  return (
    <div style={slideContent}>
      <div style={emojiStyle}>📷</div>
      <h1 style={titleStyle}>Scannerizza e guadagna</h1>
      <div style={{ width: "100%", maxWidth: 320, margin: "16px 0", display: "grid", gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "12px 16px",
            }}
          >
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <span style={{ flex: 1, color: "#fff", fontSize: 14, fontWeight: 600 }}>{item.text}</span>
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: 10,
                padding: "3px 10px",
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              {item.points}
            </span>
          </div>
        ))}
      </div>
      <p style={bodyStyle}>Ogni visita conta. Più esplori, più punti accumuli.</p>
    </div>
  );
}

function SlideBadges() {
  return (
    <div style={slideContent}>
      <div style={emojiStyle}>🎖️</div>
      <h1 style={titleStyle}>Sblocca badge unici</h1>
      <p style={bodyStyle}>
        Accumula punti e completa missioni per sbloccare badge Comuni, Rari, Epici e Leggendari.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          width: "100%",
          maxWidth: 300,
          margin: "12px 0",
        }}
      >
        {RARITY_EXAMPLES.map((b) => (
          <div
            key={b.name}
            style={{
              background: b.bg,
              border: `1.5px solid ${b.border}`,
              borderRadius: 14,
              padding: "12px 10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 4 }}>{b.icon}</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{b.name}</div>
            <div style={{ color: b.border, fontSize: 10, fontWeight: 800 }}>{b.rarity}</div>
          </div>
        ))}
      </div>
      <p style={{ ...bodyStyle, fontSize: 13, opacity: 0.75 }}>
        Alcuni badge sono segreti — scoprili esplorando la città!
      </p>
    </div>
  );
}

function SlidePrizes() {
  return (
    <div style={slideContent}>
      <div style={emojiStyle}>🎁</div>
      <h1 style={titleStyle}>Vinci premi ogni settimana</h1>
      <p style={bodyStyle}>
        Ogni settimana i migliori esploratori vincono premi reali offerti dagli spot della città.
      </p>
      <div
        style={{
          background: "rgba(255,255,255,0.12)",
          borderRadius: 18,
          padding: "18px 20px",
          width: "100%",
          maxWidth: 300,
          margin: "12px 0",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 28 }}>🥇</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Classifica settimanale</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>
              Scala la classifica e ritira il tuo premio direttamente nel locale!
            </div>
          </div>
        </div>
      </div>
      <p style={{ ...bodyStyle, fontSize: 13, opacity: 0.75 }}>
        Ogni lunedì si azzera — ricomincia la gara!
      </p>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const slideContent: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  width: "100%",
  maxWidth: 380,
};

const emojiStyle: React.CSSProperties = {
  fontSize: 72,
  marginBottom: 20,
  lineHeight: 1,
  filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.25))",
};

const titleStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: 26,
  fontWeight: 900,
  margin: "0 0 10px",
  lineHeight: 1.2,
};

const subtitleStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.9)",
  fontSize: 16,
  fontWeight: 700,
  margin: "0 0 12px",
  lineHeight: 1.4,
};

const bodyStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.75)",
  fontSize: 15,
  margin: "0",
  lineHeight: 1.5,
};

const btnPrimary: React.CSSProperties = {
  background: "#fff",
  color: "#2D1B69",
  border: "none",
  borderRadius: 16,
  padding: "16px",
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
  width: "100%",
  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
};

const btnSecondary: React.CSSProperties = {
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 16,
  padding: "14px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  width: "100%",
};
