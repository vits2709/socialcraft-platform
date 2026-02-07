"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) throw new Error("Missing NEXT_PUBLIC supabase env");
    return createBrowserClient(url, anon);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    window.location.href = "/venue";
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="h1">Login</h1>
      <p className="muted">Accesso riservato a Venue e Admin.</p>

      {msg ? <div className="notice" style={{ margin: "12px 0" }}>{msg}</div> : null}

      <form onSubmit={onSubmit}>
        <label className="label">Email</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

        <label className="label">Password</label>
        <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

        <div style={{ height: 12 }} />
        <button className="btn btnPrimary" type="submit" disabled={loading}>
          {loading ? "Accesso..." : "Entra"}
        </button>
      </form>

      <div style={{ height: 10 }} />
      <p className="muted" style={{ margin: 0 }}>
        Se sei admin, verrai reindirizzato a <b>/admin</b>.
      </p>
    </div>
  );
}
