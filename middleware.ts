import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function makeId() {
  // id semplice e valido per cookie
  return crypto.randomUUID();
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Non toccare API, assets, ecc.
  const pathname = req.nextUrl.pathname;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return res;
  }

  const has = req.cookies.get("sc_uid")?.value;
  if (!has) {
    res.cookies.set("sc_uid", makeId(), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 anno
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};