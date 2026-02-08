import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export async function POST(req: Request) {
  const form = await req.formData();
  const venueId = String(form.get("venue_id") ?? "").trim();
  const file = form.get("file");

  if (!venueId) return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });

  const cookieStore = cookies();
  const userId = cookieStore.get("sc_uid")?.value; // utente “auto”
  if (!userId) return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  // Deve esserci uno scan recente (presenza) prima dell’upload
  const now = new Date();
  const since = new Date(now.getTime() - 90 * 60 * 1000).toISOString(); // 90 min

  const { data: lastScan, error: scanErr } = await supabase
    .from("venue_events")
    .select("id,created_at")
    .eq("venue_id", venueId)
    .eq("user_id", userId)
    .eq("event_type", "scan")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scanErr) return NextResponse.json({ ok: false, error: scanErr.message }, { status: 500 });
  if (!lastScan) return NextResponse.json({ ok: false, error: "no_recent_scan_for_venue" }, { status: 403 });

  // rate limit: 1 conferma/venue/giorno per user
  const daySince = new Date();
  daySince.setHours(0, 0, 0, 0);

  const { data: already, error: alreadyErr } = await supabase
    .from("receipt_verifications")
    .select("id")
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .eq("status", "approved")
    .gte("created_at", daySince.toISOString())
    .limit(1);

  if (alreadyErr) return NextResponse.json({ ok: false, error: alreadyErr.message }, { status: 500 });
  if (already && already.length > 0)
    return NextResponse.json({ ok: false, error: "already_confirmed_today" }, { status: 429 });

  // calcola hash e salva su storage
  const ab = await file.arrayBuffer();
  const buf = Buffer.from(ab);
  const hash = sha256(buf);

  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}_${hash.slice(0, 12)}.${ext}`;

  const { error: upErr } = await supabase.storage.from("receipts").upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (upErr) {
    // se è un conflitto hash/dup, ci pensa unique index dopo
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  // crea record pending
  const { data: created, error: insErr } = await supabase
    .from("receipt_verifications")
    .insert({
      user_id: userId,
      venue_id: venueId,
      status: "pending",
      reason: null,
      receipt_datetime: null,
      image_path: path,
      image_hash: hash,
    })
    .select("id,status,created_at")
    .single();

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verification_id: created.id });
}