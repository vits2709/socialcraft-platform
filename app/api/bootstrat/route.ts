import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function makeName(uid: string) {
  return `utente-${uid.slice(0, 6)}`;
}

export async function POST() {
  const cookieStore = await cookies();
  let userId = cookieStore.get("sc_uid")?.value;

  // Se già esiste, ok
  if (userId) {
    return NextResponse.json({ ok: true, user_id: userId });
  }

  userId = crypto.randomUUID();
  const supabase = createSupabaseAdminClient();

  // 1) sc_users (uuid)
  const { error: e1 } = await supabase.from("sc_users").insert({ id: userId });
  // se è già presente non è un problema (dipende dai constraint)
  // ma se non hai un unique/PK qui, non duplicare: metti PK su sc_users.id
  if (e1 && !String(e1.message).toLowerCase().includes("duplicate")) {
    // non blocchiamo se sc_users non serve davvero, ma meglio loggare
  }

  // 2) leaderboard_users (id TEXT)
  // upsert così non duplichi mai
  const { error: e2 } = await supabase.from("leaderboard_users").upsert(
    {
      id: String(userId),
      name: makeName(userId),
      score: 0,
      meta: "auto_user",
    },
    { onConflict: "id" }
  );
  if (e2) {
    return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });
  }

  // Set cookie (httpOnly)
  cookieStore.set("sc_uid", userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 anno
  });

  return NextResponse.json({ ok: true, user_id: userId });
}