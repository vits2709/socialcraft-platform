import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizeName(n: string | null | undefined) {
  return String(n ?? "").trim();
}

function isPlaceholderName(n: string) {
  const s = n.trim().toLowerCase();
  return !s || s === "guest" || s === "utente" || s === "user";
}

async function ensureScUser(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  // NON sovrascrivere mai il nome se esiste già
  const { data: existing, error: selErr } = await supabase
    .from("sc_users")
    .select("id,name")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) throw new Error(`ensure_sc_user_failed: ${selErr.message}`);
  if (existing?.id) return { id: String(existing.id), name: normalizeName(existing.name) || "Guest" };

  const { data: created, error: insErr } = await supabase
    .from("sc_users")
    .insert({ id: userId, name: "Guest" })
    .select("id,name")
    .single();

  if (insErr) throw new Error(`ensure_sc_user_failed: ${insErr.message}`);
  return { id: String(created.id), name: normalizeName(created.name) || "Guest" };
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({} as any))) as any;
  const venueIdRaw = String(body?.venue_id ?? "").trim();
  const slugRaw = String(body?.slug ?? "").trim();

  const supabase = createSupabaseAdminClient();

  // 0) resolve venue_id (da slug o diretto)
  let venueId = venueIdRaw;

  if (!venueId && slugRaw) {
    const { data: v, error: vErr } = await supabase
      .from("venues")
      .select("id")
      .eq("slug", slugRaw)
      .maybeSingle();

    if (vErr) return NextResponse.json({ ok: false, error: `venue_lookup_failed: ${vErr.message}` }, { status: 500 });
    if (!v?.id) return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    venueId = String(v.id);
  }

  if (!venueId) {
    return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
  }

  if (!isUuid(venueId)) {
    return NextResponse.json({ ok: false, error: "venue_id_not_uuid" }, { status: 400 });
  }

  // 1) ensure profilo (sc_users)
  let scName = "Guest";
  try {
    const ensured = await ensureScUser(supabase, userId);
    scName = ensured.name || "Guest";
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "ensure_sc_user_failed" }, { status: 500 });
  }

  // ✅ IMPORTANTISSIMO:
  // Non passiamo un placeholder all'RPC, altrimenti sovrascrive il nickname in leaderboard_users.
  const nameForLeaderboard: string | null = isPlaceholderName(scName) ? null : scName;

  // 2) info venue (per RPC venue lunga non ambigua)
  const { data: venueRow, error: vInfoErr } = await supabase
    .from("venues")
    .select("id,name,slug")
    .eq("id", venueId)
    .maybeSingle();

  if (vInfoErr) {
    return NextResponse.json({ ok: false, error: `venue_info_failed: ${vInfoErr.message}` }, { status: 500 });
  }

  const venueName = String(venueRow?.name ?? "Venue");
  const venueSlug = String(venueRow?.slug ?? "");
  const venueMeta = venueSlug ? `slug=${venueSlug}` : `venue_uuid=${venueId}`;

  // 3) salva evento scan
  const { error: evErr } = await supabase.from("venue_events").insert({
    venue_id: venueId,
    user_id: userId,
    event_type: "scan",
  });

  if (evErr) return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });

  // 4) punti base scan
  const points = 2;

  const { error: ueErr } = await supabase.from("user_events").insert({
    user_id: userId,
    venue_id: venueId,
    event_type: "scan",
    points,
  });

  if (ueErr) return NextResponse.json({ ok: false, error: ueErr.message }, { status: 500 });

  // 5) Leaderboard users (chiamiamo sempre la variante lunga → NO ambiguità)
  //    Ma con p_name = null NON sovrascrive il nome esistente.
  const { error: uRpcErr } = await supabase.rpc("increment_user_score_text", {
    p_user_id: String(userId),
    p_points: points,
    p_name: nameForLeaderboard, // ✅ null se Guest/utente
  });

  if (uRpcErr) {
    return NextResponse.json({ ok: false, error: `increment_user_failed: ${uRpcErr.message}` }, { status: 500 });
  }

  // 6) Leaderboard venues (sempre variante lunga → NO ambiguità)
  const { error: vRpcErr } = await supabase.rpc("increment_venue_score_uuid", {
    p_venue_id: venueId,
    p_points: points,
    p_name: venueName,
    p_meta: venueMeta,
  });

  if (vRpcErr) {
    return NextResponse.json({ ok: false, error: `increment_venue_failed: ${vRpcErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    venue_id: venueId,
    points,
    sc_user_name: scName,
    leaderboard_name_sent: nameForLeaderboard,
    venue_name: venueName,
  });
}