"use client";

import Link from "next/link";
import { useState } from "react";

export default function ExplorerLoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: pass,
          expected_role: "explorer",
        }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (${res.status}): ${txt.slice(0, 120)}`);
      }

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "login_failed");

      window.location.assign("/me");
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setMsg(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMsg("Logout ok ✅");
    } catch {
      setMsg("Errore logout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Accedi (Esploratori)</h1>
      <p className="muted">Accedi per non perdere punti tra device.</p>

      {msg ? <div className="notice" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoCapitalize="none" autoCorrect="off" />
        <input className="input" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />

        <button className="btn primary" onClick={submit} disabled={loading}>
          {loading ? "Accesso..." : "Accedi"}
        </button>

        {/* mobile-proof: form + assign */}
        <button type="button" className="btn" onClick={() => window.location.assign("/signup")} disabled={loading}>
          Crea profilo →
        </button>

        <button type="button" className="btn" onClick={logout} disabled={loading}>
          Logout
        </button>

        <div className="muted" style={{ textAlign: "center" }}>
          Oppure <Link href="/"><b>torna alla leaderboard</b></Link>
        </div>
      </div>
    </div>
  );
}