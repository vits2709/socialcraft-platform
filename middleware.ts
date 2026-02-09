import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",        // home
  "/login",   // login esploratori
  "/signup",  // signup esploratori  ✅ FIX
  "/logout",  // logout (se esiste)
];

// roba che deve sempre passare (assets + api auth)
function isAlwaysAllowed(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;

  // next internals / static
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;

  // api auth (signup/login/logout)
  if (pathname.startsWith("/api/auth/")) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ lascia passare tutto ciò che è pubblico
  if (isAlwaysAllowed(pathname)) {
    return NextResponse.next();
  }

  // Cookie esploratore (sc_uid)
  const scUid = req.cookies.get("sc_uid")?.value?.trim();

  // ✅ Proteggi SOLO le pagine explorer che richiedono profilo
  if (pathname.startsWith("/me") || pathname.startsWith("/u")) {
    if (!scUid) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Admin/Spot: qui NON tocchiamo niente.
  // Le tue pagine server-side già fanno redirect("/login") se non c’è sessione admin/spot.
  // Quindi il middleware non deve bloccarle per forza.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};