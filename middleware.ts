import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/logout",
  "/admin/login",
];

function isAlwaysAllowed(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;

  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;

  // explorer auth
  if (pathname.startsWith("/api/auth/")) return true;

  // admin login endpoint
  if (pathname === "/api/admin/login") return true;
  if (pathname === "/api/admin/logout") return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isAlwaysAllowed(pathname)) return NextResponse.next();

  // Explorer cookie
  const scUid = req.cookies.get("sc_uid")?.value?.trim();

  // Protect explorer pages only
  if (pathname.startsWith("/me") || pathname.startsWith("/u")) {
    if (!scUid) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Admin cookie (separato!)
  const adminUid = req.cookies.get("sc_admin_uid")?.value?.trim();

  // Protect /admin (pages + api admin, tranne login)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!adminUid && pathname !== "/admin/login" && pathname !== "/api/admin/login") {
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