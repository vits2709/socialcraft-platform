"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role: "explorer",
          display_name: displayName.trim(),
          email: email.trim(),
          password: pass,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (${res.status}): ${txt.slice(0, 120)}`);
      }

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "signup_failed");

      // Dopo signup: vai al login preservando il redirect (es. /checkin/[slug])
      const redirectParam = new URLSearchParams(window.location.search).get("redirect");
      const loginDest = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login";
      window.location.assign(loginDest);
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Crea profilo Esploratore</h1>
      <p className="muted">Email + password. Il nickname è solo come compari in classifica.</p>

      {msg ? <div className="notice" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input className="input" placeholder="Nickname (es. Vits)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoCapitalize="none" autoCorrect="off" />
        <input className="input" placeholder="Password (min 6)" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />

        <button className="btn primary" onClick={submit} disabled={loading}>
          {loading ? "Creazione..." : "Crea account"}
        </button>

        <div className="muted">
          Hai già un account? <Link href="/login"><b>Accedi</b></Link>
        </div>
      </div>
    </div>
  );
}