"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin",               label: "Dashboard",    exact: true },
  { href: "/admin/spots",         label: "Spot" },
  { href: "/admin/users",         label: "Utenti" },
  { href: "/admin/receipts",      label: "Scontrini" },
  { href: "/admin/missions",      label: "Missioni" },
  { href: "/admin/prizes",        label: "Premi" },
  { href: "/admin/notifications", label: "Notifiche" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminNavbar({ showLogout }: { showLogout: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkStyle = (href: string, exact?: boolean): React.CSSProperties => {
    const active = isActive(pathname, href, exact);
    return {
      display: "block",
      padding: "7px 13px",
      borderRadius: 9,
      fontSize: 14,
      fontWeight: 600,
      whiteSpace: "nowrap",
      background: active ? "#2D1B69" : "transparent",
      color: active ? "white" : "rgba(15,23,42,0.68)",
      transition: "background 140ms, color 140ms",
      textDecoration: "none",
    };
  };

  const mobileLinkStyle = (href: string, exact?: boolean): React.CSSProperties => ({
    ...linkStyle(href, exact),
    padding: "12px 14px",
    fontSize: 15,
    borderRadius: 10,
  });

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "white",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 2px 14px rgba(0,0,0,0.07)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            height: 56,
            gap: 12,
          }}
        >
          {/* Brand */}
          <Link
            href="/admin"
            style={{
              fontWeight: 900,
              fontSize: 16,
              color: "#2D1B69",
              whiteSpace: "nowrap",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            CityQuest{" "}
            <span style={{ color: "#7BC043" }}>•</span>{" "}
            <span style={{ fontWeight: 500, color: "rgba(15,23,42,0.55)", fontSize: 14 }}>Admin</span>
          </Link>

          {/* Desktop nav links */}
          <div
            className="adminDesktopLinks"
            style={{ gap: 2, flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={linkStyle(l.href, l.exact)}>
                {l.label}
              </Link>
            ))}
            {showLogout && (
              <Link
                href="/logout"
                style={{ ...linkStyle("/logout"), color: "#ef4444" }}
              >
                Logout
              </Link>
            )}
          </div>

          {/* Hamburger button — shown via CSS on mobile */}
          <button
            className="adminHamBtn"
            onClick={() => setOpen((p) => !p)}
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            style={{
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 10,
              padding: "6px 10px",
              fontSize: 20,
              lineHeight: 1,
              marginLeft: "auto",
              flexShrink: 0,
              color: "#2D1B69",
            }}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div
            style={{
              borderTop: "1px solid rgba(0,0,0,0.07)",
              padding: "8px 16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              background: "white",
            }}
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={mobileLinkStyle(l.href, l.exact)}
              >
                {l.label}
              </Link>
            ))}
            {showLogout && (
              <Link
                href="/logout"
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "12px 14px",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#ef4444",
                  textDecoration: "none",
                }}
              >
                Logout
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
