"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "invalid" | "done";

function italianizeError(msg: string): string {
  if (msg.includes("Password should be at least"))
    return "La password deve essere di almeno 8 caratteri.";
  if (msg.includes("same password"))
    return "La nuova password deve essere diversa da quella attuale.";
  if (msg.includes("expired") || msg.includes("invalid"))
    return "Il link di reset è scaduto o non valido. Richiedine uno nuovo.";
  return `Errore: ${msg}`;
}

export default function ResetPasswordPage() {
  const supabase = useRef(createSupabaseBrowserClient()).current;

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Supabase browser client legge automaticamente il hash/code dalla URL
    // e spara PASSWORD_RECOVERY quando il token è valido.
    const timer = setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        clearTimeout(timer);
        setStatus("ready");
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleReset() {
    setErr(null);

    if (password.length < 8) {
      setErr("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setErr("Le password non coincidono.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErr(italianizeError(error.message));
      setLoading(false);
      return;
    }

    setStatus("done");
    // Piccolo delay per mostrare il messaggio di successo, poi redirect
    setTimeout(() => {
      window.location.assign("/login?reset=1");
    }, 1800);
  }

  /* ---- Stati ---- */

  if (status === "checking") {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="muted" style={{ textAlign: "center", padding: "24px 0" }}>
          Verifica del link in corso…
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 14 }}>
        <h1 className="h1">Link non valido</h1>
        <p className="muted">
          Il link di reset è scaduto o non è più valido. I link hanno una durata limitata.
        </p>
        <Link
          href="/forgot-password"
          className="btn primary"
          style={{ textAlign: "center" }}
        >
          Richiedi un nuovo link →
        </Link>
        <div className="muted" style={{ textAlign: "center" }}>
          <Link href="/login"><b>← Torna al login</b></Link>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{
          padding: "20px",
          borderRadius: 16,
          background: "rgba(16,185,129,0.10)",
          border: "1px solid rgba(16,185,129,0.25)",
          color: "#065f46",
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.6,
        }}>
          ✅ Password aggiornata con successo!
          <div style={{ marginTop: 6, fontWeight: 500, opacity: 0.8, fontSize: 13 }}>
            Reindirizzamento al login…
          </div>
        </div>
      </div>
    );
  }

  /* ---- Form principale ---- */
  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Nuova password</h1>
      <p className="muted">Scegli una nuova password per il tuo account.</p>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {err && (
          <div className="notice" style={{ color: "#991b1b", fontWeight: 700 }}>
            {err}
          </div>
        )}

        <input
          className="input"
          type="password"
          placeholder="Nuova password (min. 8 caratteri)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="new-password"
        />

        <input
          className="input"
          type="password"
          placeholder="Conferma password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleReset(); }}
          disabled={loading}
          autoComplete="new-password"
        />

        {/* Indicatore forza password */}
        {password.length > 0 && (
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ height: 4, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                borderRadius: 999,
                width: password.length >= 12 ? "100%" : password.length >= 8 ? "66%" : "33%",
                background: password.length >= 12
                  ? "linear-gradient(90deg, #10b981, #3b82f6)"
                  : password.length >= 8
                  ? "linear-gradient(90deg, #f59e0b, #10b981)"
                  : "#ef4444",
                transition: "width 200ms, background 200ms",
              }} />
            </div>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 700 }}>
              {password.length < 8 ? "Troppo corta" : password.length < 12 ? "Accettabile" : "Ottima"}
            </div>
          </div>
        )}

        <button className="btn primary" onClick={handleReset} disabled={loading}>
          {loading ? "Aggiornamento…" : "Aggiorna password"}
        </button>

        <div className="muted" style={{ textAlign: "center" }}>
          <Link href="/login"><b>← Torna al login</b></Link>
        </div>
      </div>
    </div>
  );
}
