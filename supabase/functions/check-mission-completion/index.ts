// Supabase Edge Function — Controlla e aggiorna completamento missioni
// Chiamata in fire-and-forget dopo ogni azione utente rilevante
// (check-in, scontrino approvato, voto).
//
// Input JSON:
// {
//   "user_id":    "uuid",          // sc_users.id
//   "action_type": "checkin" | "receipt_approved" | "vote",
//   "action_data": {
//     "spot_id":         "uuid",
//     "spot_category":   "bar" | "ristorante" | ...,
//     "receipt_amount":  15.50,
//     "checkin_time":    "2026-02-23T18:30:00Z",
//     "checkin_weekday": 1,          // 0=Dom, 1=Lun, ..., 6=Sab
//     "companion_count": 2
//   }
// }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActionType = "checkin" | "receipt_approved" | "vote";

interface ActionData {
  spot_id?: string;
  spot_category?: string;
  receipt_amount?: number | null;
  checkin_time?: string;
  checkin_weekday?: number;
  companion_count?: number;
}

interface MissionRow {
  id: string;
  mission_type: string;
  config: Record<string, unknown>;
  points_reward: number;
  badge_reward: string | null;
  max_completions: number | null;
  is_surprise: boolean;
  title: string;
  description: string;
  completion_message: string | null;
}

interface UserMissionRow {
  id: string;
  mission_id: string;
  progress: Record<string, unknown>;
  missions: MissionRow;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// Estrae HH:MM da una ISO string o dalla data corrente
function extractTime(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Verifica se una missione è completata dall'azione corrente.
// Ritorna null se non completata, oppure il progress aggiornato per checkin_multiple.
function evaluateCompletion(
  mission: MissionRow,
  actionType: ActionType,
  data: ActionData,
  currentProgress: Record<string, unknown>
): { completed: boolean; newProgress?: Record<string, unknown> } {
  const cfg = mission.config ?? {};

  switch (mission.mission_type) {
    case "checkin":
      return { completed: actionType === "checkin" };

    case "checkin_receipt":
      return { completed: actionType === "receipt_approved" };

    case "checkin_receipt_amount": {
      const minAmount = Number(cfg.min_amount ?? 0);
      const amount = data.receipt_amount ?? 0;
      return {
        completed: actionType === "receipt_approved" && amount >= minAmount,
      };
    }

    case "checkin_category":
      return {
        completed:
          actionType === "checkin" &&
          !!data.spot_category &&
          data.spot_category === String(cfg.category ?? ""),
      };

    case "checkin_spot":
      return {
        completed:
          actionType === "checkin" &&
          !!data.spot_id &&
          data.spot_id === String(cfg.spot_id ?? ""),
      };

    case "checkin_timeslot": {
      if (actionType !== "checkin") return { completed: false };
      const timeStart = String(cfg.time_start ?? "00:00");
      const timeEnd = String(cfg.time_end ?? "23:59");
      const current = extractTime(data.checkin_time);
      return { completed: current >= timeStart && current <= timeEnd };
    }

    case "checkin_companion": {
      const minComp = Number(cfg.min_companions ?? 1);
      return {
        completed:
          actionType === "checkin" && (data.companion_count ?? 0) >= minComp,
      };
    }

    case "vote":
      return { completed: actionType === "vote" };

    case "first_visit":
      // is_first_visit è calcolato dalla funzione chiamante
      // Viene passato come flag nei progress oppure lo calcoliamo nel chiamante
      // Qui usiamo il campo is_first_visit da currentProgress se disponibile
      return {
        completed:
          actionType === "checkin" &&
          (currentProgress.is_first_visit === true ||
            data.spot_category === undefined), // fallback conservativo
      };

    case "checkin_weekday": {
      const targetDay = Number(cfg.weekday ?? -1);
      return {
        completed:
          actionType === "checkin" &&
          targetDay >= 0 &&
          (data.checkin_weekday ?? -1) === targetDay,
      };
    }

    case "checkin_multiple": {
      if (actionType !== "checkin" || !data.spot_id) {
        return { completed: false };
      }
      const requiredCount = Number(cfg.count ?? 2);
      const visitedSpots: string[] = Array.isArray(currentProgress.spots)
        ? (currentProgress.spots as string[])
        : [];

      // Solo spot unici
      if (visitedSpots.includes(data.spot_id)) {
        return { completed: false, newProgress: currentProgress };
      }

      const updatedSpots = [...visitedSpots, data.spot_id];
      const newProgress = { spots: updatedSpots, checkins: updatedSpots.length };

      return {
        completed: updatedSpots.length >= requiredCount,
        newProgress,
      };
    }

    default:
      return { completed: false };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const userId: string = String(body?.user_id ?? "").trim();
    const actionType: ActionType = body?.action_type;
    const actionData: ActionData = body?.action_data ?? {};

    if (!userId || !actionType) {
      return jsonResponse({ ok: false, error: "missing user_id or action_type" }, 400);
    }

    const now = new Date().toISOString();

    // ── 1) Carica le user_missions non completate per questo utente ─────────
    // Joina missions per verificare che siano ancora attive
    const { data: userMissions, error: umErr } = await supabase
      .from("user_missions")
      .select(`
        id,
        mission_id,
        progress,
        missions (
          id,
          mission_type,
          config,
          points_reward,
          badge_reward,
          max_completions,
          is_surprise,
          title,
          description,
          completion_message
        )
      `)
      .eq("user_id", userId)
      .is("completed_at", null)
      .lte("missions.active_from", now)
      .gte("missions.active_until", now)
      .eq("missions.is_active", true);

    if (umErr) {
      console.error("[check-mission-completion] user_missions query failed:", umErr.message);
      return jsonResponse({ ok: false, error: umErr.message }, 500);
    }

    if (!userMissions || userMissions.length === 0) {
      return jsonResponse({ ok: true, completed: [] });
    }

    // ── 2) Per le missioni first_visit: calcola se è la prima visita ────────
    let isFirstVisit = false;
    if (actionType === "checkin" && actionData.spot_id) {
      const { count } = await supabase
        .from("user_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("venue_id", actionData.spot_id)
        .eq("event_type", "scan");

      // count include l'evento appena inserito, quindi >=1 significa prima visita se =1
      isFirstVisit = (count ?? 0) <= 1;
    }

    // ── 3) Valuta ciascuna missione ─────────────────────────────────────────
    const completedMissions: string[] = [];

    for (const um of userMissions as unknown as UserMissionRow[]) {
      const mission = um.missions;
      if (!mission) continue;

      const progress = (um.progress ?? {}) as Record<string, unknown>;

      // Inietta is_first_visit nel progress per la valutazione
      const enrichedProgress = { ...progress, is_first_visit: isFirstVisit };
      const enrichedData = { ...actionData };

      const result = evaluateCompletion(mission, actionType, enrichedData, enrichedProgress);

      if (mission.mission_type === "checkin_multiple" && result.newProgress) {
        // Aggiorna il progresso anche se non ancora completata
        if (!result.completed) {
          await supabase
            .from("user_missions")
            .update({ progress: result.newProgress })
            .eq("id", um.id);
          continue;
        }
      }

      if (!result.completed) continue;

      // ── 4) Marca come completata (guard atomico: completed_at IS NULL) ───
      const { data: updated, error: updateErr } = await supabase
        .from("user_missions")
        .update({
          completed_at: now,
          points_awarded: mission.points_reward,
          progress: result.newProgress ?? progress,
        })
        .eq("id", um.id)
        .is("completed_at", null) // guard: solo la prima volta
        .select("id")
        .maybeSingle();

      if (updateErr) {
        console.error("[check-mission-completion] update user_missions failed:", updateErr.message);
        continue;
      }
      if (!updated) {
        // Già completata da un'altra richiesta concorrente
        continue;
      }

      completedMissions.push(mission.id);

      // ── 5) Assegna punti a sc_users ──────────────────────────────────────
      const { data: uRow } = await supabase
        .from("sc_users")
        .select("points")
        .eq("id", userId)
        .maybeSingle();

      const newTotal = ((uRow?.points ?? 0) as number) + mission.points_reward;

      await supabase
        .from("sc_users")
        .update({ points: newTotal, updated_at: now })
        .eq("id", userId);

      // ── 6) Badge reward (skip: tabella badges non ancora implementata) ───
      // mission.badge_reward contiene l'uuid del badge se configurato.
      // Sarà utilizzato quando la tabella badges sarà disponibile.

      // ── 7) Controlla max_completions sulla missione ───────────────────────
      if (mission.max_completions !== null) {
        const { count: completionsCount } = await supabase
          .from("user_missions")
          .select("id", { count: "exact", head: true })
          .eq("mission_id", mission.id)
          .not("completed_at", "is", null);

        if ((completionsCount ?? 0) >= mission.max_completions) {
          await supabase
            .from("missions")
            .update({ is_active: false })
            .eq("id", mission.id);

          console.log(
            `[check-mission-completion] Mission ${mission.id} deactivated (max_completions=${mission.max_completions} reached)`
          );
        }
      }

      // ── 8) Crea notifica utente ──────────────────────────────────────────
      // user_notifications.user_id è TEXT (non UUID) — passato come stringa
      const isSurprise = mission.is_surprise;
      const notifTitle = "✅ Missione completata!";
      const notifBody = isSurprise
        ? `Missione sorpresa sbloccata: "${mission.title}" — ${mission.description}. Hai guadagnato ${mission.points_reward} punti!`
        : (mission.completion_message ??
            `"${mission.title}" completata. Hai guadagnato ${mission.points_reward} punti!`);

      await supabase.from("user_notifications").insert({
        user_id: userId, // TEXT in user_notifications
        type: "mission_completed",
        title: notifTitle,
        body: notifBody,
        data: {
          mission_id: mission.id,
          mission_title: isSurprise ? mission.title : mission.title,
          points_awarded: mission.points_reward,
          is_surprise: isSurprise,
        },
      });

      console.log(
        `[check-mission-completion] Completed mission=${mission.id} user=${userId} pts=${mission.points_reward}`
      );
    }

    return jsonResponse({ ok: true, completed: completedMissions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[check-mission-completion] Error:", msg);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
