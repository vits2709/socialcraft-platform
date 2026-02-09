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

  function validate(): string | null {
    const f = first.trim();
    const l = last.trim();
    const e = email.trim();
    if (!f) return "Inserisci il nome.";
    if (!l) return "Inserisci il cognome.";
    if (!e) return "Inserisci l’email.";
    if (!pass || pass.length < 6) return "Password troppo corta (min 6).";
    return null;
    }

  async function submit() {
    const v = validate();
    if (v) {
      setMsg(`Errore: ${v}`);
      return;
    }

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

      {/* ✅ FORM = più affidabile su iOS/Android */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading) submit();
        }}
        style={{ display: "grid", gap: 10, marginTop: 12 }}
      >
        <input
          className="input"
          placeholder="Nome"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          autoComplete="given-name"
        />

        <input
          className="input"
          placeholder="Cognome"
          value={last}
          onChange={(e) => setLast(e.target.value)}
          autoComplete="family-name"
        />

        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
          autoComplete="email"
        />

        <input
          className="input"
          placeholder="Password (min 6)"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="new-password"
        />

        {/* ✅ submit vero (mobile friendly) */}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Creazione..." : "Crea account"}
        </button>

        <div className="muted" style={{ textAlign: "center" }}>
          Hai già un account?{" "}
          <Link href="/login">
            <b>Accedi</b>
          </Link>
        </div>
      </form>
    </div>
  );
}