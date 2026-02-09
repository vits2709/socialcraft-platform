"use client";

import { useState } from "react";
import Link from "next/link";

export default function ExplorerLoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (loading) return;

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

      // hard nav per essere sicuri che i cookie vengano letti subito
      window.location.assign("/me");
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Accedi (Esploratori)</h1>
      <p className="muted">Se ti esce “missing sc_uid cookie”, qui lo sistemi.</p>

      {msg ? (
        <div className="notice" style={{ marginTop: 12 }}>
          {msg}
        </div>
      ) : null}

      {/* ✅ FORM vero: niente comportamenti strani su mobile */}
      <form
        style={{ display: "grid", gap: 10, marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
          name="email"
        />
        <input
          className="input"
          placeholder="Password"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          name="password"
        />

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Accesso..." : "Accedi"}
        </button>

        {/* ✅ SUPER bulletproof su mobile: link HTML (non JS) */}
        <a className="btn" href="/signup" aria-disabled={loading ? "true" : "false"}>
          Crea profilo →
        </a>

        <div className="muted" style={{ textAlign: "center" }}>
          Oppure{" "}
          <Link href="/">
            <b>torna alla leaderboard</b>
          </Link>
        </div>
      </form>
    </div>
  );
}