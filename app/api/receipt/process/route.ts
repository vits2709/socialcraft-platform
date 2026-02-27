import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { triggerMissionCheck } from "@/lib/missions/trigger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function calculatePoints(amount: number | null): number {
  if (!amount) return 8; // default per backward compat
  if (amount < 5)  return 4;
  if (amount < 15) return 8;
  if (amount < 30) return 12;
  if (amount < 50) return 18;
  return 25;
}

type Resp =
  | { ok: false; error: string }
  | { ok: true; status: "pending" | "approved" | "rejected" | "manual_review"; reason?: string | null; points_awarded?: number; total_points?: number };

export async function POST(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    const { data: verification, error: vErr } = await supabase
      .from("receipt_verifications")
      .select("id, user_id, venue_id, status, validation_status, reason, points_awarded, amount, ai_extracted_amount, points_amount")
      .eq("id", id)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    if (!verification) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Controlla prima gli stati terminali (impostati da AI o da admin manualmente):
    // "rejected" e "approved" hanno sempre priorità su validation_status
    if (verification.status === "rejected") {
      const out: Resp = { ok: true, status: "rejected", reason: verification.reason ?? null };
      return NextResponse.json(out);
    }

    // Se status è ancora "pending", controlla se l'AI ha richiesto revisione manuale
    if (verification.validation_status === "manual_review") {
      const out: Resp = { ok: true, status: "manual_review" };
      return NextResponse.json(out);
    }

    if (verification.status === "pending") {
      const out: Resp = { ok: true, status: "pending" };
      return NextResponse.json(out);
    }

    // approved — assegna punti se non ancora assegnati
    if (!verification.points_awarded) {
      // Calcola punti: usa points_amount dal DB se già calcolato, altrimenti ricalcola
      const amount = verification.ai_extracted_amount ?? verification.amount ?? null;
      const AWARD = verification.points_amount ?? calculatePoints(amount);

      const { data: updated, error: flagErr } = await supabase
        .from("receipt_verifications")
        .update({ points_awarded: true, points_amount: AWARD, decided_at: new Date().toISOString() })
        .eq("id", verification.id)
        .eq("points_awarded", false) // guard atomico
        .select("id")
        .maybeSingle();

      if (flagErr) return NextResponse.json({ ok: false, error: flagErr.message }, { status: 500 });

      if (updated) {
        const { data: uRow, error: uErr } = await supabase
          .from("sc_users").select("id, points").eq("id", verification.user_id).maybeSingle();

        if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
        if (!uRow) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

        const newTotal = (uRow.points ?? 0) + AWARD;

        const { error: upErr } = await supabase
          .from("sc_users")
          .update({ points: newTotal, updated_at: new Date().toISOString() })
          .eq("id", verification.user_id);

        if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

        const { error: ueErr } = await supabase.from("user_events").insert({
          user_id:      verification.user_id,
          venue_id:     verification.venue_id,
          event_type:   "receipt",
          points:       AWARD,
          points_delta: AWARD,
        });

        if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

        triggerMissionCheck(verification.user_id, "receipt_approved", {
          spot_id:       verification.venue_id,
          receipt_amount: amount,
        });

        const out: Resp = { ok: true, status: "approved", points_awarded: AWARD, total_points: newTotal };
        return NextResponse.json(out);
      }
    }

    // già assegnati
    const out: Resp = { ok: true, status: "approved", points_awarded: 0 };
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
