"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); // ✅ evita refresh
    if (loading) return;

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/login", {
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
      if (!j.ok) throw new Error(j.error || "admin_login_failed");

      // ✅ vai in admin (replace evita back weird)
      router.replace("/admin");
    } catch (err: any) {
      setMsg(`Errore: ${err?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Accedi (Spot/Admin)</h1>
      <p className="muted">Accesso per gestori di spot e amministratori.</p>

      {msg ? <div className="notice" style={{ marginTop: 12 }}>{msg}</div> : null}

      <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
        />
        <input
          className="input"
          placeholder="Password"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Accesso..." : "Accedi"}
        </button>

        <div className="muted" style={{ textAlign: "center", display: "grid", gap: 4 }}>
          <span>Sei uno spot owner? <Link href="/spot/login"><b>Login Spot</b></Link></span>
          <span>Sei un esploratore? <Link href="/login"><b>Login Esploratori</b></Link></span>
        </div>
      </form>
    </div>
  );
}