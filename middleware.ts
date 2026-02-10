import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",            // home
  "/login",       // login esploratori
  "/signup",      // signup esploratori
  "/logout",      // logout esploratori (se esiste)
  "/admin/login", // login admin
];

function isAlwaysAllowed(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;

  // Next internals / static
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ IMPORTANTISSIMO: MAI fare redirect sulle API
  // altrimenti le POST diventano 307 verso pagine HTML e rompi tutto.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ✅ pubblico
  if (isAlwaysAllowed(pathname)) {
    return NextResponse.next();
  }

  // --- Explorer cookie (sc_uid)
  const scUid = req.cookies.get("sc_uid")?.value?.trim();

  // ✅ Proteggi SOLO Explorer pages
  if (pathname.startsWith("/me") || pathname.startsWith("/u")) {
    if (!scUid) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // ✅ Admin pages: NON gestiamo sessione qui (evitiamo loop e cookie “fantasma”)
  // Le pagine server-side admin hanno già i loro redirect/check.
  // Quindi qui lasciamo passare.
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};