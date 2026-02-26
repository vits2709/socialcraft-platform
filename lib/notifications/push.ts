import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type NotifType =
  | "mission_assigned"
  | "mission_completed"
  | "prize_won"
  | "prize_expiring"
  | "overtaken"
  | "promo_active"
  | "badge_unlocked";

// Crea notifica in-app in user_notifications
export async function createNotification(
  userId: string,
  type: NotifType,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("user_notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data: data ?? {},
    });
  } catch {
    // swallow errors — notifications are non-critical
  }
}

// Invia push via OneSignal REST API
export async function sendPushNotification(
  userId: string,
  type: NotifType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!restApiKey || !appId) return;

    const supabase = createSupabaseAdminClient();
    const { data: userRow } = await supabase
      .from("sc_users")
      .select("onesignal_player_id, notification_preferences")
      .eq("id", userId)
      .maybeSingle();

    if (!userRow?.onesignal_player_id) return;

    // Controlla preferenze — default true se mancante
    const prefs = (userRow.notification_preferences ?? {}) as Record<string, boolean>;
    if (prefs[type] === false) return;

    await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_player_ids: [userRow.onesignal_player_id],
        headings: { en: title, it: title },
        contents: { en: message, it: message },
        data: data ?? {},
      }),
    });
  } catch {
    // swallow errors — push is fire-and-forget
  }
}

// Combo: crea notifica in-app + invia push
export async function notify(
  userId: string,
  type: NotifType,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Promise.all([
    createNotification(userId, type, title, body, data),
    sendPushNotification(userId, type, title, body, data),
  ]);
}
