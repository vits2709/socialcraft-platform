import "./globals.css";
import Link from "next/link";
import NavAuth from "@/components/NavAuth";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: "CityQuest",
  description: "Esplora la tua città, guadagna punti e vinci premi reali.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          width: "100%",
          overflowX: "hidden",
          background: "linear-gradient(180deg, #eef2ff 0%, #fdf2f8 100%)",
        }}
      >
        <div
          style={{
            width: "100%",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* HEADER */}
          <header className="header">
            <Link
              href="/"
              className="brand"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <img
                src="/logo.png"
                alt="CityQuest"
                style={{
                  height: 38,
                  width: 38,
                  borderRadius: 9,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: -0.3,
                }}
              >
                CityQuest
              </span>
            </Link>

            <NavAuth />
          </header>

          {/* MAIN */}
          <main
            style={{
              flex: 1,
              width: "100%",
            }}
          >
            {children}
          </main>

          {/* FOOTER */}
          <footer className="footer">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <img
                src="/logo.png"
                alt=""
                aria-hidden
                style={{
                  height: 18,
                  width: 18,
                  borderRadius: 4,
                  verticalAlign: "middle",
                }}
              />
              © {new Date().getFullYear()} CityQuest
            </span>

            <span style={{ margin: "0 8px", opacity: 0.35 }}>·</span>

            <Link
              href="/come-funziona"
              style={{
                color: "inherit",
                textDecoration: "none",
              }}
            >
              Come funziona
            </Link>
          </footer>
        </div>
      </body>
    </html>
  );
}