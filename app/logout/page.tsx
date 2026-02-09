"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        router.replace("/");
      }
    })();
  }, [router]);

  return (
    <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 className="h1">Logout</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Sto chiudendo la sessione…
      </p>
    </div>
  );
}