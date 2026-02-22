import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — assegna vincitore settimana precedente (finalize + assign_weekly_winner)
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  // 1. Finalizza classifica settimanale
  const { error: finalizeErr } = await supabase.rpc("finalize_weekly_rankings");
  if (finalizeErr) {
    return NextResponse.json({ ok: false, error: `finalize failed: ${finalizeErr.message}` }, { status: 500 });
  }

  // 2. Assegna vincitore e genera codice riscatto
  const { data: result, error: winnerErr } = await supabase.rpc("assign_weekly_winner");
  if (winnerErr) {
    return NextResponse.json({ ok: false, error: `assign_winner failed: ${winnerErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result });
}
