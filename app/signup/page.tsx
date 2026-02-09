"use client";

import { useState } from "react";
import Link from "next/link";
import CreateProfileButton from "@/components/CreateProfileButton";

type Mode = "quick" | "account";

export default function SignupPage() {
  const [mode, setMode] = useState<Mode>("account");

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (loading) return;

    const f = first.trim();
    const l = last.trim();
    const e = email.trim();
    const p = pass;

    if (!f || !l) return setMsg("Errore: inserisci nome e cognome.");
    if (!e.includes("@")) return setMsg("Errore: email non valida.");
    if (p.length < 6) return setMsg("Errore: password troppo corta (min 6).");

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          first_name: f,
          last_name: l,
          email: e,
          password: p,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (status ${res.status}): ${txt.slice(0, 80)}`);
      }

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "signup_failed");

      setMsg(`Account creato ✅ Login code: ${j.login_code}`);

      // vai al profilo
      window.location.assign("/me");
    } catch (e: any) {
      setMsg(`Errore: ${e?.message || "unknown"}`);
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1 className="h1">Crea profilo Esploratore</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Scegli come iniziare. Consiglio: <b>Email + password</b> per non perdere punti da altri device.
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button"
          className={`btn ${mode === "account" ? "primary" : ""}`}
          onClick={() => setMode("account")}
        >
          Email + password
        </button>
        <button
          type="button"
          className={`btn ${mode === "quick" ? "primary" : ""}`}
          onClick={() => setMode("quick")}
        >
          Veloce (solo device)
        </button>
      </div>

      {msg ? (
        <div className="notice" style={{ marginTop: 12 }}>
          {msg}
        </div>
      ) : null}

      {/* MODE: ACCOUNT */}
      {mode === "account" ? (
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
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
            Hai già un account?{" "}
            <Link href="/login">
              <b>Accedi</b>
            </Link>
          </div>
        </div>
      ) : null}

      {/* MODE: QUICK */}
      {mode === "quick" ? (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div className="notice">
            Modalità veloce: crea un profilo legato a questo device (cookie). Su altri device potresti dover rifare il profilo.
          </div>
          <CreateProfileButton />
          <div className="muted">
            Preferisci non perderlo? Torna su <b>Email + password</b>.
          </div>
        </div>
      ) : null}
    </div>
  );
}