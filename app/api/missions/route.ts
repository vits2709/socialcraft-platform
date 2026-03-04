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

    type UmRow = {
      id: string;
      mission_id: string;
      completed_at: string | null;
      points_awarded: number | null;
      progress: Record<string, unknown> | null;
      missions: MissionRow | null;
    };

    // Query parallela:
    // 1. Missioni attive adesso (stesso filtro temporale della home)
    // 2. user_missions dell'utente (per progresso + missioni completate storiche)
    const [activeMissionsRes, umRes] = await Promise.all([
      supabase
        .from("missions")
        .select("id, title, description, completion_message, mission_type, type, config, points_reward, is_surprise, active_from, active_until")
        .eq("is_active", true)
        .lte("active_from", now)
        .gte("active_until", now)
        .order("type")
        .order("active_from", { ascending: false }),

      supabase
        .from("user_missions")
        .select(`
          id,
          mission_id,
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
        .order("completed_at", { ascending: false, nullsFirst: true }),
    ]);

    if (activeMissionsRes.error) {
      return NextResponse.json({ ok: false, error: activeMissionsRes.error.message }, { status: 500 });
    }
    if (umRes.error) {
      return NextResponse.json({ ok: false, error: umRes.error.message }, { status: 500 });
    }

    const activeMissions = (activeMissionsRes.data ?? []) as MissionRow[];
    const umRows = (umRes.data ?? []) as unknown as UmRow[];

    // Mappa mission_id → riga user_missions (per progresso)
    const umByMission: Record<string, UmRow> = {};
    for (const um of umRows) {
      umByMission[um.mission_id] = um;
    }

    const activeMissionIds = new Set(activeMissions.map((m) => m.id));

    function buildMissionEntry(
      m: MissionRow,
      um: UmRow | null,
    ) {
      const isCompleted = !!um?.completed_at;
      const isSurpriseHidden = m.is_surprise && !isCompleted;
      return {
        user_mission_id: um?.id ?? null,
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
        completed_at: um?.completed_at ?? null,
        points_awarded: um?.points_awarded ?? null,
        progress: (um?.progress ?? {}) as Record<string, unknown>,
      };
    }

    const missions = [
      // Missioni attive (con eventuale progresso utente sovrapposto)
      ...activeMissions.map((m) => buildMissionEntry(m, umByMission[m.id] ?? null)),

      // Missioni completate storiche (scadute ma completate dall'utente)
      ...umRows
        .filter((um) => um.completed_at && !activeMissionIds.has(um.mission_id))
        .map((um) => {
          const m = um.missions;
          if (!m) return null;
          return buildMissionEntry(m, um);
        })
        .filter(Boolean),
    ];

    return NextResponse.json({ ok: true, missions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
