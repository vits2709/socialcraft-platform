import Link from "next/link";
import { getSessionUser, isAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  let showLogout = false;
  if (user) {
    showLogout = await isAdmin(user.id);
  }

  return (
    <div className="container">
      {/* HEADER ADMIN */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 600 }}>SocialCraft • Admin</div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn mini" href="/admin">
            Dashboard
          </Link>

          <Link className="btn mini" href="/admin/users">
            Utenti
          </Link>

          <Link className="btn mini" href="/admin/receipts">
            Scontrini
          </Link>

          {showLogout && (
            <Link className="btn mini" href="/logout">
              Logout
            </Link>
          )}
        </div>
      </header>

      {/* CONTENUTO PAGINE ADMIN */}
      {children}
    </div>
  );
}