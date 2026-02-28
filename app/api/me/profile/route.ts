import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(t: string) {
  return t
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const scUid = cookieStore.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const body = await req.json();
    const {
      bio,
      instagram,
      tiktok,
      twitter_x,
      avatar_emoji,
      profile_color,
      showcase_badges,
      is_public,
      username,
    } = body;

    const supabase = createSupabaseAdminClient();

    const updates: Record<string, unknown> = {};

    if (bio !== undefined) {
      if (typeof bio === "string" && bio.length > 100) {
        return NextResponse.json({ ok: false, error: "bio_too_long" }, { status: 400 });
      }
      updates.bio = bio ?? null;
    }

    if (instagram !== undefined) updates.instagram = instagram ?? null;
    if (tiktok !== undefined) updates.tiktok = tiktok ?? null;
    if (twitter_x !== undefined) updates.twitter_x = twitter_x ?? null;
    if (avatar_emoji !== undefined) updates.avatar_emoji = avatar_emoji ?? "🧭";
    if (profile_color !== undefined) updates.profile_color = profile_color ?? "#2D1B69";
    if (showcase_badges !== undefined) updates.showcase_badges = showcase_badges ?? [];
    if (is_public !== undefined) updates.is_public = Boolean(is_public);

    if (username !== undefined) {
      const slug = slugify(String(username ?? ""));
      if (!slug) {
        return NextResponse.json({ ok: false, error: "invalid_username" }, { status: 400 });
      }
      // Check uniqueness
      const { data: existing } = await supabase
        .from("sc_users")
        .select("id")
        .eq("username", slug)
        .neq("id", scUid)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ ok: false, error: "username_taken" }, { status: 409 });
      }
      updates.username = slug;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "no_fields" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("sc_users")
      .update(updates)
      .eq("id", scUid)
      .select("id,username,bio,instagram,tiktok,twitter_x,avatar_emoji,profile_color,showcase_badges,is_public")
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
