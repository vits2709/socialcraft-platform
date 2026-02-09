"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
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
          first_name: first.trim(),
          last_name: last.trim(),
          email: email.trim(),
          password: pass,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (status ${res.status}): ${txt.slice(0, 120)}`);
      }

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "signup_failed");

      setMsg(`Account creato ✅ Login code: ${j.login_code ?? "—"}`);
      window.location.href = "/me";
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Crea profilo Esploratore</h1>
      <p className="muted">Email + password (così non perdi punti da altri device).</p>

      {msg ? (
        <div className="notice" style={{ marginTop: 12 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input className="input" placeholder="Nome" value={first} onChange={(e) => setFirst(e.target.value)} />
        <input className="input" placeholder="Cognome" value={last} onChange={(e) => setLast(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          className="input"
          placeholder="Password (min 6)"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

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