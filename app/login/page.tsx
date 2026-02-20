"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ExplorerLoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetOk, setResetOk] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") setResetOk(true);
  }, []);

  async function submit() {
    setLoading(true);
    setMsg(null);
    // Leggi il redirect dalla query string (client-side, sicuro)
    const redirectTo = new URLSearchParams(window.location.search).get("redirect") ?? "/me";
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

      window.location.assign(redirectTo);
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Image src="/logo.png" alt="CityQuest" height={52} width={160} style={{ height: 52, width: "auto" }} />
      </div>
      <h1 className="h1">Accedi (Esploratori)</h1>
      <p className="muted">Accedi per non perdere punti tra device.</p>

      {resetOk && (
        <div style={{
          marginTop: 12, padding: "12px 14px", borderRadius: 14,
          background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)",
          color: "#065f46", fontWeight: 700, fontSize: 14,
        }}>
          ✅ Password aggiornata con successo. Accedi con la nuova password.
        </div>
      )}

      {msg ? <div className="notice" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoCapitalize="none" autoCorrect="off" />

        <div style={{ display: "grid", gap: 6 }}>
          <input className="input" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          <div style={{ textAlign: "right" }}>
            <Link href="/forgot-password" style={{ fontSize: 13, opacity: 0.72, fontWeight: 700 }}>
              Hai dimenticato la password?
            </Link>
          </div>
        </div>

        <button className="btn primary" onClick={submit} disabled={loading}>
          {loading ? "Accesso..." : "Accedi"}
        </button>

        <button type="button" className="btn" onClick={() => window.location.assign("/signup")} disabled={loading}>
          Crea profilo →
        </button>

        <div className="muted" style={{ textAlign: "center" }}>
          Oppure <Link href="/"><b>torna alla leaderboard</b></Link>
        </div>
      </div>
    </div>
  );
}