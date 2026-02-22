import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_TTL_MS = 10 * 60 * 1000;

function generateCode(): string {
  let code = "GRP-";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function todayRange() {
  const day = new Date().toISOString().slice(0, 10);
  return { start: `${day}T00:00:00.000Z`, end: `${day}T23:59:59.999Z` };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) {
      return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const venue_id = String(body?.venue_id ?? "").trim();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);

    if (!venue_id) {
      return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    }
    if (!isFinite(lat) || !isFinite(lng)) {
      return NextResponse.json({ ok: false, error: "missing_geo" }, { status: 400 });
    }

    const { start, end } = todayRange();
    const { count, error: scanErr } = await supabase
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", scUid)
      .eq("venue_id", venue_id)
      .eq("event_type", "scan")
      .gte("created_at", start)
      .lte("created_at", end);

    if (scanErr) {
      return NextResponse.json({ ok: false, error: scanErr.message }, { status: 500 });
    }
    if ((count ?? 0) === 0) {
      return NextResponse.json({ ok: false, error: "no_checkin_today" }, { status: 403 });
    }

    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    let code = "";
    let attempts = 0;
    while (attempts < 10) {
      code = generateCode();
      const { error: insErr } = await supabase.from("companion_codes").insert({
        code,
        venue_id,
        creator_id: scUid,
        creator_lat: lat,
        creator_lng: lng,
        expires_at: expiresAt,
      });
      if (!insErr) break;
      attempts++;
    }

    if (!code) {
      return NextResponse.json({ ok: false, error: "code_generation_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, code, expires_at: expiresAt });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
