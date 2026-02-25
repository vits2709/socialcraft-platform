// Helper per triggerare il check missioni in fire-and-forget.
// Gli errori non bloccano mai il flusso principale.

export type MissionActionType = "checkin" | "receipt_approved" | "vote";

export interface MissionActionData {
  spot_id?: string;
  spot_category?: string | null;
  receipt_amount?: number | null;
  checkin_time?: string;
  checkin_weekday?: number;
  companion_count?: number;
}

export function triggerMissionCheck(
  userId: string,
  actionType: MissionActionType,
  actionData: MissionActionData
): void {
  // Fire-and-forget: non si attende la risposta, gli errori sono swallowed.
  // Un fallimento nel check missioni non deve mai bloccare check-in / vote / scontrino.
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn("[missions] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skip mission check");
      return;
    }

    const url = `${supabaseUrl}/functions/v1/check-mission-completion`;

    fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        action_type: actionType,
        action_data: actionData,
      }),
    }).catch((err: Error) => {
      // Non-fatal: log solo per debug
      console.error("[missions] trigger fetch failed:", err?.message ?? "unknown");
    });
  } catch {
    // Mai bloccare
  }
}
