import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) {
      return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();

    // Missioni assegnate all'utente, attive o completate negli ultimi 30 giorni
    const { data, error } = await supabase
      .from("user_missions")
      .select(`
        id,
        completed_at,
        points_awarded,
        progress,
        missions (
          id,
          title,
          description,
          completion_message,
          mission_type,
          type,
          config,
          points_reward,
          is_surprise,
          active_from,
          active_until
        )
      `)
      .eq("user_id", scUid)
      .order("completed_at", { ascending: false, nullsFirst: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Filtra: missioni attive O completate (sempre visibili)
    type MissionRow = {
      id: string;
      title: string;
      description: string;
      completion_message: string | null;
      mission_type: string;
      type: string;
      config: Record<string, unknown>;
      points_reward: number;
      is_surprise: boolean;
      active_from: string;
      active_until: string;
    };

    type UserMissionRow = {
      id: string;
      completed_at: string | null;
      points_awarded: number | null;
      progress: Record<string, unknown> | null;
      missions: MissionRow | null;
    };

    const rows = (data as unknown as UserMissionRow[]).filter((um) => {
      const m = um.missions;
      if (!m) return false;
      if (um.completed_at) return true;
      return m.active_from <= now && m.active_until >= now;
    });

    const missions = rows.map((um) => {
      const m = um.missions;

      if (!m) return null;

      const isCompleted = !!um.completed_at;
      const isSurpriseHidden = m.is_surprise && !isCompleted;

      return {
        user_mission_id: um.id,
        mission_id: m.id,
        title: isSurpriseHidden ? "Missione sorpresa" : m.title,
        description: isSurpriseHidden ? "Completa un'azione per scoprirla!" : m.description,
        completion_message: m.completion_message,
        mission_type: m.mission_type,
        type: m.type,
        points_reward: m.points_reward,
        is_surprise: m.is_surprise,
        is_surprise_hidden: isSurpriseHidden,
        active_from: m.active_from,
        active_until: m.active_until,
        completed_at: um.completed_at ?? null,
        points_awarded: um.points_awarded ?? null,
        progress: (um.progress ?? {}) as Record<string, unknown>,
      };
    }).filter(Boolean);

    return NextResponse.json({ ok: true, missions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
