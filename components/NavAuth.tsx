"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Status = {
  explorer: boolean;
  admin: boolean;
  spot: boolean;
  name: string | null;
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/feed", label: "Feed" },
  { href: "/venue", label: "Spot" },
  { href: "/come-funziona", label: "Come funziona" },
];

export default function NavAuth() {
  const [status, setStatus] = useState<Status | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    let alive = true;
    fetch("/api/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (alive) setStatus(j); })
      .catch(() => { if (alive) setStatus({ explorer: false, admin: false, spot: false, name: null }); });
    return () => { alive = false; };
  }, []);

  // Chiudi dropdown cliccando fuori
  useEffect(() => {
    if (!dropdownOpen) return;
    function handle(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dropdownOpen]);

  // Chiudi su Escape
  useEffect(() => {
    if (!dropdownOpen && !menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setDropdownOpen(false); setMenuOpen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dropdownOpen, menuOpen]);

  // Blocca scroll body quando il drawer è aperto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const { explorer = false, admin = false, spot = false, name = null } = status ?? {};
  const loggedIn = explorer || admin || spot;
  const loaded = status !== null;
  const initial = (name ?? (admin ? "A" : "U")).charAt(0).toUpperCase();

  function close() { setMenuOpen(false); }

  return (
    <div className="navInner">

      {/* ── CENTER: nav links (solo desktop) ──────────────────── */}
      <div className="navCenterLinks">
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className="navCenterLink">{label}</Link>
        ))}
      </div>

      {/* ── RIGHT: auth desktop + hamburger mobile ────────────── */}
      <div className="navRight">

        {/* Desktop: avatar con dropdown o pulsanti login */}
        {loaded && (
          <>
            {loggedIn ? (
              <div ref={avatarRef} className="navAvatarWrap">
                <button
                  className="navAvatar"
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-label="Menu utente"
                  aria-expanded={dropdownOpen}
                >
                  {initial}
                </button>

                {dropdownOpen && (
                  <div className="navDropdown" role="menu">
                    {name && <div className="navDropdownHeader">{name}</div>}
                    <Link href="/me" className="navDropdownItem" onClick={() => setDropdownOpen(false)}>
                      👤 Profilo
                    </Link>
                    {admin && (
                      <Link href="/admin" className="navDropdownItem" onClick={() => setDropdownOpen(false)}>
                        ⚙️ Admin
                      </Link>
                    )}
                    {spot && !admin && (
                      <Link href="/spot" className="navDropdownItem" onClick={() => setDropdownOpen(false)}>
                        📊 Dashboard
                      </Link>
                    )}
                    <div className="navDropdownDivider" />
                    <Link href="/logout" className="navDropdownItem navDropdownLogout">
                      Logout
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="navAuthBtns">
                <Link href="/login" className="navBtnAccedi">Accedi</Link>
                <Link href="/signup" className="navBtnRegistrati">Registrati</Link>
              </div>
            )}
          </>
        )}

        {/* Hamburger (solo mobile) */}
        <button
          className="hamburgerBtn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
          aria-expanded={menuOpen}
        >
          <span className={menuOpen ? "hbar hbar-open-1" : "hbar"} />
          <span className={menuOpen ? "hbar hbar-open-2" : "hbar"} />
          <span className={menuOpen ? "hbar hbar-open-3" : "hbar"} />
        </button>
      </div>

      {/* ── MOBILE DRAWER (portaled su document.body) ─────────── */}
      {menuOpen && mounted && createPortal(
        <>
          {/* Overlay scuro */}
          <div className="drawerOverlay" onClick={close} aria-hidden="true" />

          {/* Pannello slide-in da destra */}
          <div className="navDrawer" role="dialog" aria-modal="true" aria-label="Menu navigazione">

            {/* Header drawer */}
            <div className="drawerHeader">
              <div>
                {loggedIn && (
                  <div className="drawerAvatar">{initial}</div>
                )}
                <div className="drawerName">
                  {name ?? (loggedIn ? "Menu" : "CityQuest")}
                </div>
              </div>
              <button className="drawerCloseBtn" onClick={close} aria-label="Chiudi menu">
                ×
              </button>
            </div>

            {/* Link di navigazione */}
            <nav className="drawerNav">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="drawerLink" onClick={close}>
                  {label}
                </Link>
              ))}

              {loaded && (
                <>
                  <div className="drawerDivider" />
                  {loggedIn ? (
                    <>
                      <Link href="/me" className="drawerLink" onClick={close}>👤 Profilo</Link>
                      {admin && <Link href="/admin" className="drawerLink" onClick={close}>⚙️ Admin</Link>}
                      {spot && !admin && <Link href="/spot" className="drawerLink" onClick={close}>📊 Dashboard</Link>}
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="drawerLink" onClick={close}>Accedi</Link>
                      <Link href="/signup" className="drawerLink" onClick={close}>Registrati</Link>
                    </>
                  )}
                </>
              )}
            </nav>

            {/* Logout in fondo */}
            {loggedIn && (
              <div className="drawerFooter">
                <Link href="/logout" className="drawerLogoutBtn" onClick={close}>
                  Esci dall&apos;account
                </Link>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
