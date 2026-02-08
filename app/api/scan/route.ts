import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("sc_uid")?.value;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const venueId = String(body?.venue_id ?? "").trim();

    if (!venueId) {
      return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // 1) salva evento scan
    const { error: evErr } = await supabase.from("venue_events").insert({
      venue_id: venueId,
      user_id: userId,
      event_type: "scan",
    });
    if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });

    // 2) punti scan (se li usi come "score")
    const points = 2;

    const { error: ueErr } = await supabase.from("user_events").insert({
      user_id: userId,
      venue_id: venueId,
      event_type: "scan",
      points,
    });
    if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

    // 3) aggiorna leaderboard USERS (increment reale via SQL sarebbe meglio, qui fallback safe)
    await supabase.from("leaderboard_users").upsert(
      { id: String(userId), name: "utente", score: points },
      { onConflict: "id" }
    );

    // 4) aggiorna contatore scans della VENUE tramite RPC (parametri CORRETTI)
    const { error: rpcErr } = await supabase.rpc("increment_venue_scans", {
      p_venue_id: venueId,  // UUID come stringa va bene
      p_inc: 1,             // oppure points se vuoi sommare score
    });

    if (rpcErr) {
      return NextResponse.json(
        { ok: false, error: `increment_venue_scans_failed: ${rpcErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, venue_id: venueId, points });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}