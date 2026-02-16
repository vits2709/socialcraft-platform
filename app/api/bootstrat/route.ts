import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeName(uid: string) {
  return `utente-${uid.slice(0, 6)}`;
}

export async function POST() {
  const cookieStore = await cookies();
  let userId = cookieStore.get("sc_uid")?.value?.trim();

  if (userId) return NextResponse.json({ ok: true, user_id: userId });

  userId = crypto.randomUUID();
  const supabase = createSupabaseAdminClient();

  // ✅ Solo sc_users: la leaderboard legge da sc_users via view
  const { error: e1 } = await supabase.from("sc_users").insert({
    id: userId,
    name: makeName(userId),
    points: 0,
  });

  if (e1 && !String(e1.message).toLowerCase().includes("duplicate")) {
    return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });
  }

  cookieStore.set("sc_uid", userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true, user_id: userId });
}