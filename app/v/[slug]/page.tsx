"use client";

import { useEffect, useState } from "react";

export default function VenueScan({ params }: { params: { slug: string } }) {
  const [status, setStatus] = useState<"loading" | "counted" | "already">("loading");

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `visit:${params.slug}:${today}`;

    if (localStorage.getItem(key)) {
      setStatus("already");
    } else {
      localStorage.setItem(key, "1");
      setStatus("counted");
    }
  }, [params.slug]);

  return (
    <main style={{ padding: 24 }}>
      <h1>VENUE SCAN</h1>
      <p>Slug: {params.slug}</p>

      {status === "loading" && <p>Caricamento…</p>}
      {status === "counted" && <p>✅ Visita registrata</p>}
      {status === "already" && <p>ℹ️ Visita già registrata oggi</p>}

      <p style={{ marginTop: 20, fontSize: 12, opacity: 0.6 }}>
        build: SCAN-A-2026-02-03-REAL
      </p>
    </main>
  );
}

