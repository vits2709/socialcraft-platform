import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — restituisce i badge sbloccati (con timestamp) dal DB per l'utente corrente
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const { data, error } = await supabase
      .from("user_badge_unlocks")
      .select("badge_id, unlocked_at")
      .eq("user_id", scUid)
      .order("unlocked_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, unlocks: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}

// POST — salva i badge appena sbloccati (upsert idempotente)
// Body: { badge_ids: string[] }
// Returns: { ok: true, unlocks: DbUnlock[] } — lista aggiornata completa
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.badge_ids) ? body.badge_ids : [];

    if (ids.length > 0) {
      const rows = ids.map((badge_id) => ({ user_id: scUid, badge_id }));
      const { error } = await supabase
        .from("user_badge_unlocks")
        .upsert(rows, { onConflict: "user_id,badge_id" });

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Ritorna la lista completa aggiornata
    const { data } = await supabase
      .from("user_badge_unlocks")
      .select("badge_id, unlocked_at")
      .eq("user_id", scUid)
      .order("unlocked_at", { ascending: false });

    return NextResponse.json({ ok: true, unlocks: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
