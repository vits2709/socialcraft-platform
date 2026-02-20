// API per inviare notifiche push — usata solo da server (admin/cron)
// Usa web-push per inviare notifiche. Richiede:
//   VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT in .env.local

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// web-push non ha tipi TypeScript integrati, import dynamico
let webpush: any = null;
async function getWebPush() {
  if (!webpush) webpush = await import("web-push");
  return webpush.default ?? webpush;
}

export async function POST(req: NextRequest) {
  try {
    // Autenticazione interna: solo con service role key
    const authHeader = req.headers.get("authorization") ?? "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!authHeader.includes(serviceKey)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.user_id;
    const title: string = String(body?.title ?? "CityQuest");
    const message: string = String(body?.body ?? "Hai una nuova notifica!");
    const url: string = String(body?.url ?? "/");

    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:info@cityquest.it";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ ok: false, error: "VAPID keys not configured" }, { status: 500 });
    }

    const wp = await getWebPush();
    wp.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabase = createSupabaseAdminClient();

    // Carica subscriptions
    let query = supabase.from("push_subscriptions").select("endpoint,p256dh,auth,user_id");
    if (userId) query = query.eq("user_id", userId);

    const { data: subs, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const payload = JSON.stringify({ title, body: message, url });

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subs ?? []) {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (e: any) {
        // Se 410 Gone → rimuovi subscription scaduta
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else {
          failed.push(sub.endpoint.slice(-20));
        }
      }
    }

    return NextResponse.json({ ok: true, sent, failed: failed.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
