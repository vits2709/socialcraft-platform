import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function newUid() {
  // id breve ma abbastanza unico per “utente auto”
  return `u_${crypto.randomBytes(12).toString("hex")}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const venueId = String(body?.venue_id ?? body?.venueId ?? "").trim();

  if (!venueId) {
    return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
  }

  // ✅ Next 16: cookies() è Promise
  const cookieStore = await cookies();

  let userId = cookieStore.get("sc_uid")?.value;

  // Se non esiste, crea utente “auto” e salva cookie
  if (!userId) {
    userId = newUid();

    // Qui siamo in Route Handler → puoi settare cookie
    cookieStore.set("sc_uid", userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 anno
    });
  }

  const supabase = createSupabaseAdminClient();

  // Registra lo scan (presenza)
  const { error } = await supabase.from("venue_events").insert({
    venue_id: venueId,
    user_id: userId,
    event_type: "scan",
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: userId, venue_id: venueId });
}