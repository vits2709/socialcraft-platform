import "./globals.css";
import NavAuth from "@/components/NavAuth";

export const metadata = {
  title: "SocialCraft",
  description: "Esplora gli spot, colleziona punti e scala la classifica degli esploratori.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">SocialCraft</div>
            {/* NavAuth include tutti i link + hamburger mobile */}
            <nav className="nav">
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