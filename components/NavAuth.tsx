"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResp = { ok: boolean };

export default function NavAuth() {
  const [logged, setLogged] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          if (alive) setLogged(false);
          return;
        }
        const j = (await res.json()) as MeResp;
        if (alive) setLogged(Boolean(j?.ok));
      } catch {
        if (alive) setLogged(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // mentre carica, non mostra nulla (così non “balla” la navbar)
  if (logged !== true) return null;

  return <Link href="/logout">Logout</Link>;
}