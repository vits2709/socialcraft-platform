import "./globals.css";
import Link from "next/link";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export const metadata = {
  title: "SocialCraft – Spot & Esploratori",
  description: "Leaderboard + scan QR per punti",
};

async function getRole() {
  const user = await getSessionUser(); // sessione per Admin/Spot
  if (!user) return { role: "explorer" as const, email: null as string | null };

  const admin = await isAdmin(user.id);
  if (admin) return { role: "admin" as const, email: user.email ?? null };

  // euristica “spot”: se esiste una venue con owner_user_id = user.id
  // (non rompe nulla: è read-only)
  const supabase = await createSupabaseServerClientReadOnly();
  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (venue) return { role: "spot" as const, email: user.email ?? null };

  // se è autenticato ma non admin/spot, lo trattiamo come explorer
  return { role: "explorer" as const, email: user.email ?? null };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { role } = await getRole();

  return (
    <html lang="it">
      <body>
        <div className="container">
          <header className="header">
            <Link className="brand" href="/">
              SocialCraft
            </Link>

            <nav className="nav">
              {/* Sempre */}
              <Link href="/">Classifiche</Link>
              <Link href="/scan">Scannerizza</Link>
              <Link href="/me">Il mio profilo</Link>

              {/* Solo Spot */}
              {role === "spot" ? <Link href="/venue">Dashboard Spot</Link> : null}

              {/* Solo Admin */}
              {role === "admin" ? <Link href="/admin">Admin</Link> : null}

              {/* Solo se NON admin/spot (perché login è riservato) */}
              {role === "explorer" ? <Link href="/login">Accedi</Link> : null}
            </nav>
          </header>

          <main className="main">{children}</main>

          <footer className="footer">
            <span>© {new Date().getFullYear()} SocialCraft</span>
          </footer>
        </div>
      </body>
    </html>
  );
}