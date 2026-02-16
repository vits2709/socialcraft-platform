import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Resp =
  | { ok: false; error: string }
  | { ok: true; status: "pending" | "approved" | "rejected"; reason?: string | null; points_awarded?: number; total_points?: number };

export async function POST(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    // 1) verification
    const { data: verification, error: vErr } = await supabase
      .from("receipt_verifications")
      .select("id, user_id, venue_id, status, reason, points_awarded")
      .eq("id", id)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
    if (!verification) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    if (verification.status === "pending") {
      const out: Resp = { ok: true, status: "pending" };
      return NextResponse.json(out);
    }

    if (verification.status === "rejected") {
      const out: Resp = { ok: true, status: "rejected", reason: verification.reason ?? null };
      return NextResponse.json(out);
    }

    // approved
    const AWARD = 8;

    // ✅ atomic guard: award only if points_awarded was false
    if (!verification.points_awarded) {
      const { data: updated, error: flagErr } = await supabase
        .from("receipt_verifications")
        .update({ points_awarded: true, decided_at: new Date().toISOString() })
        .eq("id", verification.id)
        .eq("points_awarded", false)
        .select("id")
        .maybeSingle();

      if (flagErr) return NextResponse.json({ ok: false, error: flagErr.message }, { status: 500 });

      // if updated exists => we are the first time awarding
      if (updated) {
        const { data: uRow, error: uErr } = await supabase
          .from("sc_users")
          .select("id, points")
          .eq("id", verification.user_id)
          .maybeSingle();

        if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
        if (!uRow) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

        const newTotal = (uRow.points ?? 0) + AWARD;

        const { error: upErr } = await supabase
          .from("sc_users")
          .update({ points: newTotal, updated_at: new Date().toISOString() })
          .eq("id", verification.user_id);

        if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

        const { error: ueErr } = await supabase.from("user_events").insert({
          user_id: verification.user_id,
          venue_id: verification.venue_id,
          event_type: "receipt",
          points: AWARD,
          points_delta: AWARD,
        });

        if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

        const out: Resp = { ok: true, status: "approved", points_awarded: AWARD, total_points: newTotal };
        return NextResponse.json(out);
      }
    }

    // already awarded before
    const out: Resp = { ok: true, status: "approved", points_awarded: 0 };
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}