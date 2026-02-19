// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/logout",
  "/admin/login",
  "/spot/login",
];

function isAlwaysAllowed(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;

  // API pubbliche di auth
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/admin/")) return true; // se esiste la tua login admin custom

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isAlwaysAllowed(pathname)) return NextResponse.next();

  // Explorer: proteggo solo /me e /u/*
  if (pathname.startsWith("/me") || pathname.startsWith("/u")) {
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Admin/Spot: non blocco qui (ci pensano le pagine server-side)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};