import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkAdmin() {
  const user = await getSessionUser();
  if (!user) return null;
  const ok = await isAdmin(user.id);
  return ok ? user : null;
}

// GET — lista premi (ultimi 10)
export async function GET() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("weekly_prizes")
    .select("id,week_start,prize_description,prize_image,spot_id,winner_user_id,winner_name,winner_assigned_at,redemption_code,redeemed,redeemed_at,venues(id,name,slug)")
    .order("week_start", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prizes: data ?? [] });
}

// POST — configura un nuovo premio (o aggiorna se la settimana esiste già)
// Body: { week_start: string, prize_description: string, spot_id?: string, prize_image?: string }
export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { week_start, prize_description, spot_id, prize_image } = body;

  if (!week_start || !prize_description) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("weekly_prizes")
    .upsert({
      week_start,
      prize_description: String(prize_description).trim(),
      spot_id: spot_id || null,
      prize_image: prize_image || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "week_start" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prize: data });
}
