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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (alive) setStatus(j); })
      .catch(() => { if (alive) setStatus({ explorer: false, admin: false, spot: false }); });
    return () => { alive = false; };
  }, []);

  // Close menu on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const { explorer = false, admin = false, spot = false } = status ?? {};
  const loggedIn = explorer || admin || spot;
  const loaded = status !== null;

  function close() { setOpen(false); }

  const staticLinks = (
    <>
      <Link href="/" onClick={close}>Home</Link>
      <Link href="/feed" onClick={close}>Feed</Link>
      <Link href="/venue" onClick={close}>Spot</Link>
      <Link href="/me" onClick={close}>Profilo</Link>
    </>
  );

  const authLinks = loaded ? (
    <>
      {admin && <Link href="/admin" onClick={close}>Admin</Link>}
      {spot && !admin && <Link href="/spot" onClick={close}>Dashboard</Link>}
      {!loggedIn && <Link href="/admin/login" onClick={close}>Accedi (Spot/Admin)</Link>}
      {loggedIn
        ? <Link href="/logout" onClick={close}>Logout</Link>
        : <Link href="/login" onClick={close}>Login</Link>}
    </>
  ) : null;

  return (
    <>
      {/* Desktop: links in riga */}
      <div className="navLinks">
        {staticLinks}
        {authLinks}
      </div>

      {/* Mobile: hamburger button */}
      <button
        className="hamburgerBtn"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Chiudi menu" : "Apri menu"}
        aria-expanded={open}
        aria-controls="mobileMenuPanel"
      >
        <span className={open ? "hbar hbar-open-1" : "hbar"} />
        <span className={open ? "hbar hbar-open-2" : "hbar"} />
        <span className={open ? "hbar hbar-open-3" : "hbar"} />
      </button>

      {/* Mobile: overlay + pannello */}
      {open && (
        <>
          <div className="menuOverlay" onClick={close} aria-hidden="true" />
          <div className="mobileMenu" id="mobileMenuPanel" role="dialog" aria-label="Menu navigazione">
            <button className="mobileMenuClose" onClick={close} aria-label="Chiudi menu">✕</button>
            {staticLinks}
            {authLinks}
          </div>
        </>
      )}
    </>
  );
}
