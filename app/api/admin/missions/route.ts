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

// GET /api/admin/missions — lista tutte le missioni con conteggio completamenti
export async function GET() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  const [missionsRes, countsRes] = await Promise.all([
    supabase
      .from("missions")
      .select("*")
      .order("type")
      .order("created_at", { ascending: false }),

    supabase
      .from("user_missions")
      .select("mission_id")
      .not("completed_at", "is", null),
  ]);

  if (missionsRes.error) {
    return NextResponse.json({ ok: false, error: missionsRes.error.message }, { status: 500 });
  }

  // Costruisce mappa mission_id → count completamenti
  const countMap: Record<string, number> = {};
  for (const row of countsRes.data ?? []) {
    countMap[row.mission_id] = (countMap[row.mission_id] ?? 0) + 1;
  }

  const missions = (missionsRes.data ?? []).map((m) => ({
    ...m,
    completions_count: countMap[m.id] ?? 0,
  }));

  return NextResponse.json({ ok: true, missions });
}

// POST /api/admin/missions — crea nuova missione (template o schedulata)
export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    type, emoji, title, description, completion_message,
    mission_type, config, points_reward, is_surprise,
    max_completions, is_active, active_from, active_until,
  } = body;

  if (!type || !String(title ?? "").trim() || !mission_type || !active_from || !active_until) {
    return NextResponse.json({ ok: false, error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("missions")
    .insert({
      type,
      emoji: emoji || "🎯",
      title: String(title).trim(),
      description: String(description ?? "").trim(),
      completion_message: String(completion_message ?? "").trim() || null,
      mission_type,
      config: config ?? {},
      points_reward: Number(points_reward ?? 5),
      is_surprise: Boolean(is_surprise),
      max_completions: max_completions != null ? Number(max_completions) : null,
      is_active: Boolean(is_active),
      active_from,
      active_until,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mission: { ...data, completions_count: 0 } });
}
