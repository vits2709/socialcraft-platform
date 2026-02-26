import { NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/missions/bootstrap
// Attiva tutti i template (is_active=false, active_from ≈ 2000-01-01)
// con date valide per i prossimi 365 giorni, poi assegna a tutti gli utenti.
// Operazione idempotente: salta i template già attivati in precedenza.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const supabase = createSupabaseAdminClient();

  const now = new Date();
  const until = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  // 1. Attiva tutti i template (quelli seeded hanno active_from = "2000-01-01")
  const { data: activatedRows, error: activateErr } = await supabase
    .from("missions")
    .update({
      is_active: true,
      active_from: now.toISOString(),
      active_until: until.toISOString(),
    })
    .eq("is_active", false)
    .lt("active_from", "2001-01-01T00:00:00Z") // solo i template seeded
    .select("id");

  if (activateErr) {
    return NextResponse.json({ ok: false, error: activateErr.message }, { status: 500 });
  }

  // 2. Assegna missioni giornaliere + settimanali a tutti gli utenti
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let dailyResult: Record<string, unknown> = {};
  let weeklyResult: Record<string, unknown> = {};

  if (supabaseUrl && serviceRoleKey) {
    const [dailyRes, weeklyRes] = await Promise.all([
      fetch(`${supabaseUrl}/functions/v1/assign-daily-missions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
      fetch(`${supabaseUrl}/functions/v1/assign-weekly-missions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    ]);

    dailyResult = await dailyRes.json().catch(() => ({}));
    weeklyResult = await weeklyRes.json().catch(() => ({}));
  }

  return NextResponse.json({
    ok: true,
    activated: activatedRows?.length ?? 0,
    daily: dailyResult,
    weekly: weeklyResult,
  });
}
