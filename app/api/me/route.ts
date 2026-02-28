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
      .select("id, name, points, updated_at, notification_preferences, username, bio, instagram, tiktok, twitter_x, avatar_emoji, profile_color, showcase_badges, is_public")
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
        notification_preferences: u.notification_preferences ?? null,
        username: (u as any).username ?? null,
        bio: (u as any).bio ?? null,
        instagram: (u as any).instagram ?? null,
        tiktok: (u as any).tiktok ?? null,
        twitter_x: (u as any).twitter_x ?? null,
        avatar_emoji: (u as any).avatar_emoji ?? "🧭",
        profile_color: (u as any).profile_color ?? "#2D1B69",
        showcase_badges: (u as any).showcase_badges ?? [],
        is_public: (u as any).is_public ?? true,
      },
      last_events: lastEvents ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}