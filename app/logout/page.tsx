"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        // Hard reload: forza il re-mount di NavAuth e il re-fetch dello stato auth
        window.location.replace("/");
      }
    })();
  }, []);

  return (
    <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 className="h1">Logout</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Sto chiudendo la sessione…
      </p>
    </div>
  );
}