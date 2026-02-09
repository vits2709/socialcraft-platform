import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cleanName(input: unknown) {
  const s = String(input ?? "").trim();
  // niente stringhe vuote, niente nomi troppo lunghi
  if (!s) return null;
  if (s.length > 24) return s.slice(0, 24);
  return s;
}

function isForbiddenName(name: string) {
  const s = name.trim().toLowerCase();
  return s === "utente" || s === "guest" || s === "user";
}

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;
  if (!userId) return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.from("sc_users").select("id,name").eq("id", userId).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    user: {
      id: userId,
      name: data?.name ?? "Guest",
    },
  });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;
  if (!userId) return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });

  const body = (await req.json().catch(() => ({} as any))) as any;
  const name = cleanName(body?.name);

  if (!name) return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
  if (isForbiddenName(name)) return NextResponse.json({ ok: false, error: "name_not_allowed" }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  // 1) upsert su sc_users (fonte verità)
  const { error: upErr } = await supabase.from("sc_users").upsert(
    { id: userId, name },
    { onConflict: "id" }
  );

  if (upErr) return NextResponse.json({ ok: false, error: `save_sc_user_failed: ${upErr.message}` }, { status: 500 });

  // 2) aggiorna anche leaderboard_users (così lo vedi subito in classifica)
  // NB: id lì può essere TEXT o UUID: noi passiamo sempre stringa userId
  const { error: lbErr } = await supabase.from("leaderboard_users").upsert(
    { id: String(userId), name, score: 0 },
    { onConflict: "id" }
  );

  if (lbErr) {
    // non blocchiamo il profilo se leaderboard rompe, però te lo segnalo
    return NextResponse.json({ ok: true, name, warning: `leaderboard_update_failed: ${lbErr.message}` });
  }

  return NextResponse.json({ ok: true, name });
}