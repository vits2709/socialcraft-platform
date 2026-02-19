"use client";

import Link from "next/link";
import { useState } from "react";

export default function SpotLoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/spot/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (${res.status}): ${txt.slice(0, 120)}`);
      }

      const j = await res.json();
      if (!j.ok) {
        const msgs: Record<string, string> = {
          invalid_credentials: "Email o password non corretti.",
          not_spot_owner: "Questo account non è associato a nessuno spot.",
          missing_fields: "Inserisci email e password.",
        };
        throw new Error(msgs[j.error] ?? j.error ?? "login_failed");
      }

      window.location.assign("/venue"); // o /spot/dashboard se ce l’hai
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Accedi (Spot/Admin)</h1>
      <p className="muted">Accesso per gestori di spot e amministratori.</p>

      {msg ? <div className="notice" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoCapitalize="none" autoCorrect="off" />
        <input className="input" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />

        <button className="btn primary" onClick={submit} disabled={loading}>
          {loading ? "Accesso..." : "Accedi"}
        </button>

        <div className="muted" style={{ textAlign: "center", display: "grid", gap: 4 }}>
          <span>Sei un admin? <Link href="/admin/login"><b>Login Admin</b></Link></span>
          <span>Sei un esploratore? <Link href="/login"><b>Login Esploratori</b></Link></span>
        </div>
      </div>
    </div>
  );
}