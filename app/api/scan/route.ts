import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function ensureScUser(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  // Inserisce utente se non esiste
  const { error } = await supabase
    .from("sc_users")
    .upsert(
      {
        id: userId,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    throw new Error(`ensure_user_failed: ${error.message}`);
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("sc_uid")?.value;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "missing_sc_uid_cookie" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({} as any));

    const venueId = String(body?.venue_id ?? "").trim();
    const slug = String(body?.slug ?? "").trim();

    const supabase = createSupabaseAdminClient();

    // Se arriva slug lo risolviamo
    let resolvedVenueId = venueId;

    if (!resolvedVenueId && slug) {
      const { data: v, error: vErr } = await supabase
        .from("venues")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (vErr) {
        return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
      }

      if (!v?.id) {
        return NextResponse.json({ ok: false, error: "venue_not_found" }, { status: 404 });
      }

      resolvedVenueId = String(v.id);
    }

    if (!resolvedVenueId) {
      return NextResponse.json(
        { ok: false, error: "missing_venue_id" },
        { status: 400 }
      );
    }

    // Assicura utente (FIX FK)
    await ensureScUser(supabase, userId);

    // Evento venue
    const { error: evErr } = await supabase.from("venue_events").insert({
      venue_id: resolvedVenueId,
      user_id: userId,
      event_type: "scan",
    });

    if (evErr) {
      return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });
    }

    // Evento utente
    const points = 2;

    const { error: ueErr } = await supabase.from("user_events").insert({
      user_id: userId,
      venue_id: resolvedVenueId,
      event_type: "scan",
      points,
    });

    if (ueErr) {
      return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });
    }

    // Leaderboard utenti
    await supabase.rpc("increment_user_score", {
      p_user_id: userId,
      p_points: points,
    }).catch(() => null);

    // Leaderboard venues
    await supabase.rpc("increment_venue_score_uuid", {
      p_venue_id: resolvedVenueId,
      p_points: points,
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      venue_id: resolvedVenueId,
      points,
    });

  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 }
    );
  }
}