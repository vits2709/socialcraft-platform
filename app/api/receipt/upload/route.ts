import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function asStr(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const venueId = asStr(form.get("venue_id"));
    const file = form.get("file");

    if (!venueId) {
      return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
    }

    // ✅ Next 16: cookies() async
    const cookieStore = await cookies();
    const userId = cookieStore.get("sc_uid")?.value?.trim();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    // 0) deve esserci uno scan recente per quello spot
    const since = new Date(Date.now() - 90 * 60 * 1000).toISOString();
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

    if (scanErr) {
      console.error("upload: scan check failed", scanErr);
      return NextResponse.json({ ok: false, error: `scan_check_failed:${scanErr.message}` }, { status: 500 });
    }
    if (!lastScan) {
      return NextResponse.json({ ok: false, error: "no_recent_scan_for_spot" }, { status: 403 });
    }

    // 1) hash file
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    const hash = sha256(buf);

    // 2) se già esiste per questo user+hash, riusa (evita unique constraint)
    const { data: existing, error: exErr } = await supabase
      .from("receipt_verifications")
      .select("id,status")
      .eq("user_id", userId)
      .eq("image_hash", hash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exErr) {
      console.error("upload: existing check failed", exErr);
      return NextResponse.json({ ok: false, error: `existing_check_failed:${exErr.message}` }, { status: 500 });
    }

    if (existing?.id) {
      return NextResponse.json({
        ok: true,
        verification_id: existing.id,
        status: existing.status,
        reused: true,
      });
    }

    // ✅ image_path è NOT NULL nel tuo DB → lo valorizziamo SUBITO
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ext.match(/^[a-z0-9]+$/) ? ext : "jpg";
    const path = `${userId}/${Date.now()}_${hash.slice(0, 12)}.${safeExt}`;

    // 3) crea record pending (con image_path già valorizzato)
    const { data: created, error: insErr } = await supabase
      .from("receipt_verifications")
      .insert({
        user_id: userId,
        venue_id: venueId,
        status: "pending",
        reason: null,
        receipt_datetime: null,
        image_path: path, // ✅ NOT NULL ok
        image_hash: hash,
      })
      .select("id,status,created_at")
      .single();

    if (insErr) {
      console.error("upload: insert failed", insErr);

      const msg = (insErr as any)?.message?.toLowerCase?.() ?? "";
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("receipt_verifications_unique_user_hash")) {
        return NextResponse.json({ ok: false, error: "duplicate_receipt" }, { status: 409 });
      }

      return NextResponse.json({ ok: false, error: `insert_failed:${insErr.message}` }, { status: 500 });
    }

    const receiptId = String(created.id);

    // 4) upload su storage
    const { error: upErr } = await supabase.storage.from("receipts").upload(path, buf, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

    if (upErr) {
      console.error("upload: storage upload failed", upErr);

      // best effort: marca riga come rejected
      await supabase
        .from("receipt_verifications")
        .update({
          status: "rejected",
          reason: "storage_upload_failed",
          decided_at: new Date().toISOString(),
        })
        .eq("id", receiptId);

      return NextResponse.json({ ok: false, error: `storage_upload_failed:${upErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, verification_id: receiptId, reused: false });
  } catch (e: any) {
    console.error("upload: unexpected", e);
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}