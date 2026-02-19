import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const endpoint = String(body?.endpoint ?? "").trim();
    const p256dh = String(body?.p256dh ?? "").trim();
    const auth = String(body?.auth ?? "").trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Upsert: se l'endpoint esiste già, aggiorna le chiavi
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: scUid, endpoint, p256dh, auth, updated_at: new Date().toISOString() },
        { onConflict: "endpoint" }
      );

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
