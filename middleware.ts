import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ NON bloccare MAI le API: devono rispondere JSON, non HTML.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ✅ lascia passare asset e file Next
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return NextResponse.next();
  }

  // Se hai pagine pubbliche (leaderboard, venue pubblica ecc) NON bloccarle
  // Adatta questa whitelist al tuo progetto
  const publicPaths = ["/", "/login"];
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/v/"); // pagina venue pubblica

  if (isPublic) return NextResponse.next();

  // 🔐 Protezione base per pagine private
  const scUid = req.cookies.get("sc_uid")?.value;
  if (!scUid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
      Matcha tutte le route tranne asset statici.
      Nota: /api/* lo lasciamo passare sopra.
    */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};