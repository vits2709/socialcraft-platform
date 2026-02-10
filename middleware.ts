import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",           // home
  "/login",      // login esploratori
  "/signup",     // signup esploratori
  "/logout",     // logout esploratori (se esiste)
  "/admin/login" // ✅ login admin
];

function isAlwaysAllowed(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;

  // next internals / static
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;

  // api auth (explorer)
  if (pathname.startsWith("/api/auth/")) return true;

  // api admin auth (se lo aggiungi)
  if (pathname.startsWith("/api/admin/auth/")) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isAlwaysAllowed(pathname)) return NextResponse.next();

  // --- Explorer cookie
  const scUid = req.cookies.get("sc_uid")?.value?.trim();

  // ✅ Proteggi SOLO Explorer pages
  if (pathname.startsWith("/me") || pathname.startsWith("/u")) {
    if (!scUid) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // ✅ Proteggi Admin con login dedicato
  if (pathname.startsWith("/api/admin")) {
    // IMPORTANT: questo check dipende da come fai sessione admin/spot.
    // Se usi Supabase Auth, spesso trovi cookie tipo sb-... (varia col progetto).
    // Metto un check "generico" che funziona in tanti casi: se non trovi nulla -> /admin/login.
    const hasAdminSession =
      Boolean(req.cookies.get("sb-access-token")?.value) ||
      Boolean(req.cookies.get("sb:token")?.value) ||
      Boolean(req.cookies.get("sb-refresh-token")?.value);

    if (!hasAdminSession && pathname !== "/admin/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};