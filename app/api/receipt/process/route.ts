import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function endOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = (url.searchParams.get("id") ?? "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    // 1) Leggi verification
    const { data: verification, error: vErr } = await supabase
      .from("receipt_verifications")
      .select("id,status,reason,user_id,venue_id,day,created_at")
      .eq("id", id)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    if (!verification) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Se non è approvato, rispondi e basta (polling)
    if (verification.status !== "approved") {
      return NextResponse.json({
        ok: true,
        status: verification.status,
        reason: verification.reason ?? null,
      });
    }

    // 2) Se approved -> assegna +8 UNA VOLTA (idempotente per giorno+venue+user)
    const AWARD = 8;

    const dayDate = verification.day ? new Date(`${verification.day}T00:00:00.000Z`) : new Date();
    const dayStart = startOfDayISO(dayDate);
    const dayEnd = endOfDayISO(dayDate);

    // Se esiste già un evento "receipt" quel giorno per quello user+venue, non riassegnare
    const { data: existing, error: exErr } = await supabase
      .from("user_events")
      .select("id")
      .eq("user_id", verification.user_id)
      .eq("venue_id", verification.venue_id)
      .eq("event_type", "receipt")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .limit(1);

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });

    // Prendi user per punti attuali + nome
    const { data: uRow, error: uErr } = await supabase
      .from("sc_users")
      .select("id,points,name")
      .eq("id", verification.user_id)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    if (!uRow) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

    // Se già assegnato -> ritorna total_points attuale
    if (existing && existing.length > 0) {
      return NextResponse.json({
        ok: true,
        status: "approved",
        reason: verification.reason ?? null,
        points_awarded: 0,
        total_points: Number(uRow.points ?? 0),
      });
    }

    const newTotal = Number(uRow.points ?? 0) + AWARD;

    // 3) Aggiorna punti utente
    const { error: upErr } = await supabase.from("sc_users").update({ points: newTotal }).eq("id", uRow.id);
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    // 4) Log evento (schema: event_type in ['scan','vote','receipt'], niente meta)
    const { error: ueErr } = await supabase.from("user_events").insert({
      user_id: uRow.id,
      venue_id: verification.venue_id,
      event_type: "receipt",
      points: newTotal,
      points_delta: AWARD,
    });
    if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

    // 5) Aggiorna leaderboard_users con punti REALI (id è text)
    const { error: lbErr } = await supabase.from("leaderboard_users").upsert(
      {
        id: String(uRow.id),
        name: (uRow.name ?? "Guest") as string,
        score: newTotal,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (lbErr) return NextResponse.json({ ok: false, error: lbErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      status: "approved",
      reason: verification.reason ?? null,
      points_awarded: AWARD,
      total_points: newTotal,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}