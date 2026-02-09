"use client";

import { useState } from "react";
import Link from "next/link";

export default function ExplorerLoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !pass) {
      setMsg("Inserisci email e password.");
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (status ${res.status}): ${txt.slice(0, 120)}`);
      }

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "login_failed");

      window.location.href = "/me";
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Accedi</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Entra per tenere al sicuro punti e statistiche su tutti i device.
      </p>

      {msg ? (
        <div className="notice" style={{ marginTop: 12 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Password"
            type={showPass ? "text" : "password"}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
          />
          <button className="btn" type="button" onClick={() => setShowPass((s) => !s)}>
            {showPass ? "Nascondi" : "Mostra"}
          </button>
        </div>

        <button className="btn primary" onClick={submit} disabled={loading}>
          {loading ? "Accesso..." : "Accedi"}
        </button>

        <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>
            Non hai un account?{" "}
            <Link href="/signup">
              <b>Crea profilo</b>
            </Link>
          </span>

          <span className="muted" style={{ opacity: 0.85 }}>
            Problemi cookie?{" "}
            <Link href="/logout">
              <b>Reset</b>
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}