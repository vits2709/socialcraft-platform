"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ExplorerLoginPage() {
  const router = useRouter();

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
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (status ${res.status}): ${txt.slice(0, 140)}`);
      }

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "login_failed");

      // meglio di window.location: mantiene routing Next
      router.push("/me");
      router.refresh();
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

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="input"
          placeholder="Password"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
        />

        <button className="btn primary" onClick={submit} disabled={loading}>
          {loading ? "Accesso..." : "Accedi"}
        </button>

        <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>Non hai un account?</span>

          {/* Link normale */}
          <Link href="/signup">
            <b>Crea profilo</b>
          </Link>

          {/* Fallback “hard” se mai ci fosse hydration strana */}
          <button
            type="button"
            className="btn mini"
            onClick={() => (window.location.href = "/signup")}
            style={{ marginLeft: "auto" }}
          >
            Vai a Signup →
          </button>
        </div>
      </div>
    </div>
  );
}