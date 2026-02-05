import "./globals.css";

export const metadata = {
  title: "SocialCraft Leaderboards",
  description: "Venue & user leaderboards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">SocialCraft</div>
            <nav className="nav">
              <a href="/">Home</a>
              <a href="/leaderboard/venues">Venue</a>
              <a href="/leaderboard/users">Utenti</a>
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
