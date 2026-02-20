"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = useRef(createSupabaseBrowserClient()).current;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) {
      setErr("Inserisci un indirizzo email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErr("Formato email non valido.");
      return;
    }

    setLoading(true);
    setErr(null);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: "https://app.cityquest.it/reset-password",
    });

    setLoading(false);

    if (error) {
      setErr(`Errore: ${error.message}`);
      return;
    }

    setSent(true);
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Password dimenticata</h1>
      <p className="muted">
        Inserisci la tua email e ti mandiamo un link per reimpostare la password.
      </p>

      {sent ? (
        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <div style={{
            padding: "16px 18px",
            borderRadius: 16,
            background: "rgba(16,185,129,0.10)",
            border: "1px solid rgba(16,185,129,0.25)",
            color: "#065f46",
            fontWeight: 700,
            lineHeight: 1.5,
          }}>
            ✅ Se l&apos;email è registrata riceverai un link per reimpostare la password.
            <div style={{ marginTop: 6, fontWeight: 500, opacity: 0.8, fontSize: 13 }}>
              Controlla anche la cartella spam.
            </div>
          </div>

          <Link
            href="/login"
            style={{
              textAlign: "center",
              padding: "12px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.7)",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            ← Torna al login
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {err && (
            <div className="notice" style={{ color: "#991b1b", fontWeight: 700 }}>
              {err}
            </div>
          )}

          <input
            className="input"
            placeholder="La tua email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            disabled={loading}
          />

          <button className="btn primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Invio in corso..." : "Invia link di reset"}
          </button>

          <div className="muted" style={{ textAlign: "center" }}>
            <Link href="/login"><b>← Torna al login</b></Link>
          </div>
        </div>
      )}
    </div>
  );
}
