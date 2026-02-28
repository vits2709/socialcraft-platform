import Link from "next/link";

export default function ProfiloNotFound() {
  return (
    <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>
        Profilo non trovato
      </h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        L&apos;esploratore che stai cercando non esiste o ha cambiato username.
      </p>
      <Link className="btn primary" href="/">
        Torna alla home
      </Link>
    </div>
  );
}
