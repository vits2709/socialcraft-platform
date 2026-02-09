import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;

  if (!userId) return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const name = String(body?.name ?? "").trim();

  if (!name) return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
  if (name.length > 24) return NextResponse.json({ ok: false, error: "name_too_long" }, { status: 400 });

  const low = name.toLowerCase();
  if (low === "guest" || low === "utente") {
    return NextResponse.json({ ok: false, error: "name_not_allowed" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // ensure row
  const { data: existing, error: selErr } = await supabase
    .from("sc_users")
    .select("id,name,nickname_locked")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });

  if (existing?.nickname_locked) {
    return NextResponse.json({ ok: false, error: "nickname_locked" }, { status: 403 });
  }
  if (existing?.name) {
    // già impostato -> lock
    await supabase.from("sc_users").update({ nickname_locked: true }).eq("id", userId);
    return NextResponse.json({ ok: false, error: "already_set" }, { status: 403 });
  }

  // set name + lock
  const { error: upErr } = await supabase
    .from("sc_users")
    .upsert({ id: userId, name, nickname_locked: true }, { onConflict: "id" });

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  // aggiorna anche leaderboard_users senza rompere (non crea se non esiste)
  await supabase.from("leaderboard_users").update({ name }).eq("id", userId);

  return NextResponse.json({ ok: true });
}