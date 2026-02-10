import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // cancella cookie admin
  res.cookies.set("admin_uid", "", { path: "/", maxAge: 0 });
  res.cookies.set("admin_email", "", { path: "/", maxAge: 0 });

  return res;
}