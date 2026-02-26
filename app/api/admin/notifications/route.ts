import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { notify } from "@/lib/notifications/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — ultimi 20 broadcast
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id,user_id,type,title,body,data,read,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, notifications: data ?? [] });
}

// POST — broadcast manuale
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  const notifBody = String(body?.body ?? "").trim();
  const userIds: string[] | undefined = body?.user_ids;

  if (!title || !notifBody) {
    return NextResponse.json({ ok: false, error: "title and body required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  let targets: string[] = [];
  if (Array.isArray(userIds) && userIds.length > 0) {
    targets = userIds;
  } else {
    const { data: users } = await supabase.from("sc_users").select("id");
    targets = (users ?? []).map((u) => u.id);
  }

  const results = await Promise.allSettled(
    targets.map((uid) => notify(uid, "promo_active", title, notifBody, { broadcast: true }))
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, sent, total: targets.length });
}
