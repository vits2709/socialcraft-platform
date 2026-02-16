import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const scUid = cookieStore.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const supabase = createSupabaseAdminClient();

    // ✅ SINGLE SOURCE OF TRUTH: sc_users.points
    const { data: u, error: uErr } = await supabase
      .from("sc_users")
      .select("id, name, points, updated_at")
      .eq("id", scUid)
      .maybeSingle();

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    if (!u) return NextResponse.json({ ok: false, error: "profile_missing" }, { status: 404 });

    // Eventi recenti (solo per UI/storia, NON per calcolare i punti totali)
    const { data: lastEvents } = await supabase
      .from("user_events")
      .select("event_type, points, points_delta, created_at, venue_id")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      ok: true,
      user: {
        id: u.id,
        name: u.name ?? "Guest",
        points: u.points ?? 0,
        updated_at: u.updated_at,
      },
      last_events: lastEvents ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}