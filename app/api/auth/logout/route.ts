import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set("sc_uid", "", {
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}