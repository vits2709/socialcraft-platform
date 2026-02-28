import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { notify } from "@/lib/notifications/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateRedemptionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `CQ-${part()}-${part()}`;
}

function currentMondayUTC(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=dom, 1=lun, ...
  const diff = (day + 6) % 7; // giorni da sottrarre per arrivare a lunedì
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

// POST — assegna vincitore della settimana appena conclusa
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const thisMonday = currentMondayUTC();

  // 1. Cerca il premio non ancora assegnato della settimana precedente (o precedenti)
  const { data: prizeRow, error: prizeErr } = await supabase
    .from("weekly_prizes")
    .select("id,week_start,prize_description")
    .is("winner_user_id", null)
    .lt("week_start", thisMonday)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prizeErr) {
    return NextResponse.json(
      { ok: false, error: `Errore ricerca premio: ${prizeErr.message}` },
      { status: 500 }
    );
  }

  if (!prizeRow) {
    return NextResponse.json(
      { ok: false, error: "Nessun premio configurato per la settimana precedente" },
      { status: 422 }
    );
  }

  // 2. Prendi il primo in classifica settimanale PRIMA di finalizzare
  const { data: topUser, error: topErr } = await supabase
    .from("v_weekly_leaderboard")
    .select("user_id,user_name,points_week,rank")
    .order("rank", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (topErr || !topUser) {
    return NextResponse.json(
      { ok: false, error: "Nessun partecipante in classifica questa settimana" },
      { status: 422 }
    );
  }

  // 3. Genera codice di riscatto
  const redemption_code = generateRedemptionCode();

  // 4. Assegna vincitore al premio
  const { error: updateErr } = await supabase
    .from("weekly_prizes")
    .update({
      winner_user_id: topUser.user_id,
      winner_name: topUser.user_name ?? "Esploratore",
      winner_assigned_at: new Date().toISOString(),
      redemption_code,
    })
    .eq("id", prizeRow.id);

  if (updateErr) {
    return NextResponse.json(
      { ok: false, error: `Errore aggiornamento premio: ${updateErr.message}` },
      { status: 500 }
    );
  }

  // 5. Finalizza classifica settimanale (archivio/reset) — fire-and-forget
  try { await supabase.rpc("finalize_weekly_rankings"); } catch { /* ignora */ }

  // 6. Notifica vincitore
  notify(topUser.user_id, "prize_won", "🏆 Hai vinto il premio!", "Vai sul profilo per il codice di riscatto").catch(() => {});

  return NextResponse.json({
    ok: true,
    result: {
      ok: true,
      winner_name: topUser.user_name ?? "Esploratore",
      redemption_code,
      winner_id: topUser.user_id,
    },
  });
}
