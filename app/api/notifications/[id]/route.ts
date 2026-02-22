import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH — segna notifica come letta
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scUid = req.cookies.get("sc_uid")?.value?.trim();
  if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("user_notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", scUid); // sicurezza: solo le proprie

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
