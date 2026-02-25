import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkAdmin() {
  const user = await getSessionUser();
  if (!user) return null;
  const ok = await isAdmin(user.id);
  return ok ? user : null;
}

// PATCH /api/admin/missions/[id] — aggiorna missione (campi, schedule, ecc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const ALLOWED = [
    "type", "emoji", "title", "description", "completion_message",
    "mission_type", "config", "points_reward", "is_surprise",
    "max_completions", "is_active", "active_from", "active_until",
  ];

  const update: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Nessun campo da aggiornare" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("missions")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mission: data });
}

// DELETE /api/admin/missions/[id]
// Hard delete se 0 completamenti, soft delete altrimenti
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { count } = await supabase
    .from("user_missions")
    .select("id", { count: "exact", head: true })
    .eq("mission_id", id)
    .not("completed_at", "is", null);

  if ((count ?? 0) > 0) {
    // Ha completamenti → soft delete
    const { error } = await supabase
      .from("missions")
      .update({ is_active: false })
      .eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    // Nessun completamento → hard delete
    const { error } = await supabase
      .from("missions")
      .delete()
      .eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
