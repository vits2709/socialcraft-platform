// app/api/scan/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("sc_uid")?.value;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });
    }

    // IMPORTANT: sc_users.id è uuid (dal tuo schema). Se qui arriva roba tipo "u_vitale", esplode la FK.
    if (!isUuid(userId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_sc_uid_cookie_not_uuid",
          hint: "Reset cookie sc_uid / usa BootstrapUser per generarlo come UUID",
        },
        { status: 400 }
      );
    }

    // body può contenere venue_id o slug
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const url = new URL(req.url);

    const venueIdRaw = String(body?.venue_id ?? url.searchParams.get("venue_id") ?? "").trim();
    const slugRaw = String(body?.slug ?? url.searchParams.get("slug") ?? "").trim();

    const supabase = createSupabaseAdminClient();

    // 1) risolvi venue_id (se arriva slug)
    let venueId = venueIdRaw;

    if (!venueId && slugRaw) {
      const { data: v, error: vErr } = await supabase
        .from("venues")
        .select("id")
        .eq("slug", slugRaw)
        .maybeSingle();

      if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
      if (!v?.id) return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });

      venueId = String(v.id);
    }

    if (!venueId) {
      return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    }

    if (!isUuid(venueId)) {
      return NextResponse.json({ ok: false, error: "invalid_venue_id_not_uuid" }, { status: 400 });
    }

    // 2) ensure sc_users (serve per FK di user_events / venue_ratings)
    // sc_users: (id uuid primary key, created_at timestamptz default now())
    const { error: ensureErr } = await supabase.from("sc_users").upsert(
      { id: userId },
      { onConflict: "id" }
    );
    if (ensureErr) {
      return NextResponse.json({ ok: false, error: `ensure_sc_users_failed: ${ensureErr.message}` }, { status: 500 });
    }

    // 3) salva evento scan
    const { error: evErr } = await supabase.from("venue_events").insert({
      venue_id: venueId,
      user_id: userId,
      event_type: "scan",
    });
    if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });

    // 4) punti scan
    const points = 2;

    const { error: ueErr } = await supabase.from("user_events").insert({
      user_id: userId,
      venue_id: venueId,
      event_type: "scan",
      points,
    });
    if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

    // 5) aggiorna leaderboard (user + venue) via RPC (se esistono)
    //    IMPORTANT: niente .catch() -> usiamo try/catch
    try {
      await supabase.rpc("increment_user_score", {
        p_user_id: userId,      // uuid
        p_points: points,       // int
      });
    } catch {
      // ignora: se RPC non esiste o fallisce, non blocchiamo lo scan
    }

    try {
      await supabase.rpc("increment_venue_score_uuid", {
        p_venue_id: venueId,    // uuid
        p_points: points,       // int
      });
    } catch {
      // ignora
    }

    return NextResponse.json({ ok: true, venue_id: venueId, points });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}