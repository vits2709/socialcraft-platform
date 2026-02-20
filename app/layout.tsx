import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import NavAuth from "@/components/NavAuth";

export const metadata = {
  title: "CityQuest",
  description: "Esplora la tua città, guadagna punti e vinci premi reali.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Image src="/logo.png" alt="CityQuest" height={36} width={120} style={{ height: 36, width: "auto" }} />
              <span>CityQuest</span>
            </div>
            {/* NavAuth include tutti i link + hamburger mobile */}
            <nav className="nav">
              <NavAuth />
            </nav>
          </header>

          <main className="main">{children}</main>

          <footer className="footer">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Image src="/logo.png" alt="CityQuest" height={18} width={60} style={{ height: 18, width: "auto" }} />
              © {new Date().getFullYear()} CityQuest
            </span>
            <span style={{ margin: "0 8px", opacity: 0.35 }}>·</span>
            <Link href="/come-funziona" style={{ color: "inherit", textDecoration: "none" }}>
              Come funziona
            </Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
