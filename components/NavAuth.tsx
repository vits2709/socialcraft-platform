"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = {
  explorer: boolean;
  admin: boolean;
  spot: boolean;
};

export default function NavAuth() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (alive) setStatus(j); })
      .catch(() => { if (alive) setStatus({ explorer: false, admin: false, spot: false }); });
    return () => { alive = false; };
  }, []);

  if (status === null) return null;

  const { explorer, admin, spot } = status;
  const loggedIn = explorer || admin || spot;

  return (
    <>
      {admin && <Link href="/admin">Admin</Link>}
      {spot && !admin && <Link href="/spot">Spot</Link>}
      {!loggedIn && <Link href="/admin/login">Admin / Spot</Link>}
      {loggedIn
        ? <Link href="/logout">Logout</Link>
        : <Link href="/login">Login</Link>}
    </>
  );
}
