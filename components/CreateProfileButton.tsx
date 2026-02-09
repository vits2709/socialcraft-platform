"use client";

import { useState } from "react";

export default function CreateProfileButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    if (loading) return;
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Risposta non JSON (status ${res.status}): ${txt.slice(0, 80)}`);
      }

      const data = await res.json();

      if (!data?.ok) {
        throw new Error(data?.error ?? "create_profile_failed");
      }

      // ✅ dopo creazione profilo: vai al profilo
      window.location.assign("/me");
    } catch (e: any) {
      setErr(e?.message || "Errore sconosciuto");
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button className="btn primary" type="button" onClick={handleCreate} disabled={loading}>
        {loading ? "Creo profilo…" : "Crea profilo"}
      </button>

      {err ? (
        <div className="notice">
          Errore: {err}
        </div>
      ) : null}
    </div>
  );
}