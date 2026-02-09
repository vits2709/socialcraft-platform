import "./globals.css";
import NavAuth from "@/components/NavAuth";

export const metadata = {
  title: "SocialCraft – Venue Ratings",
  description: "Leaderboard venues basata su rating",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">SocialCraft</div>
            <nav className="nav">
              <a href="/">Leaderboard</a>
              <a href="/login">Login</a>
              <a href="/admin">Admin</a>
              <a href="/venue">Venue</a>

              {/* ✅ compare SOLO se loggato */}
              <NavAuth />
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