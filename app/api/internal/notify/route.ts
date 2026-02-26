import { NextRequest, NextResponse } from "next/server";
import { notify, NotifType } from "@/lib/notifications/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint interno — protetto da SERVICE_ROLE_KEY
// Usato dalle Edge Functions come relay centralizzato
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!serviceKey || !auth.includes(serviceKey)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body?.user_id ?? "").trim();
  const type = body?.type as NotifType | undefined;
  const title = String(body?.title ?? "").trim();
  const notifBody = String(body?.body ?? "").trim();
  const data = body?.data as Record<string, unknown> | undefined;

  if (!userId || !type || !title) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }

  await notify(userId, type, title, notifBody, data);
  return NextResponse.json({ ok: true });
}
