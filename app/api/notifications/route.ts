import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — lista notifiche dell'explorer corrente (ultime 20)
export async function GET(req: NextRequest) {
  const scUid = req.cookies.get("sc_uid")?.value?.trim();
  if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("user_notifications")
    .select("id,type,title,body,data,read,created_at")
    .eq("user_id", scUid)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const unread = (data ?? []).filter((n) => !n.read).length;
  return NextResponse.json({ ok: true, notifications: data ?? [], unread });
}
