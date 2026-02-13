import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 🔧 Cambia qui SOLO se il tuo bucket si chiama diversamente
const BUCKET = "receipts";

function extFromType(mime: string) {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    // 1) auth: user da cookie explorer
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) {
      return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });
    }

    // 2) parse formdata
    const form = await req.formData();
    const venueId = String(form.get("venue_id") ?? "").trim();
    const file = form.get("file") as File | null;

    if (!venueId) return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    if (!file) return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });

    // 3) bytes + hash
    const arr = await file.arrayBuffer();
    const buf = Buffer.from(arr);
    const hash = crypto.createHash("sha256").update(buf).digest("hex");

    // 4) upload su storage
    const ext = extFromType(file.type);
    const objectPath = `${scUid}/${hash}.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, buf, {
      contentType: file.type || "image/jpeg",
      upsert: false, // così se già esiste non sovrascrive
    });

    // Se il file già esiste su storage, ok: continuiamo comunque (sarà duplicate a DB o riuso)
    if (upErr && !String(upErr.message || "").toLowerCase().includes("already exists")) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    // 5) insert receipt_verifications (status pending)
    const insertPayload = {
      user_id: scUid,
      venue_id: venueId,
      status: "pending",
      reason: null,
      image_path: objectPath,
      image_hash: hash,
      // day ha default, created_at ha default
    };

    const { data: inserted, error: insErr } = await supabase
      .from("receipt_verifications")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();

    // ✅ gestione DUPLICATI: vincolo receipt_verifications_unique_user_hash
    if (insErr) {
      const msg = String(insErr.message || "");
      const isDup =
        msg.includes("receipt_verifications_unique_user_hash") ||
        msg.toLowerCase().includes("duplicate key") ||
        msg.toLowerCase().includes("unique");

      if (isDup) {
        const { data: existing, error: exErr } = await supabase
          .from("receipt_verifications")
          .select("id, status")
          .eq("user_id", scUid)
          .eq("image_hash", hash)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
        if (!existing) return NextResponse.json({ ok: false, error: "duplicate_but_missing_row" }, { status: 500 });

        return NextResponse.json({
          ok: true,
          duplicate: true,
          verification_id: existing.id,
          status: existing.status,
          message: "Scontrino già caricato ✅ (stessa foto).",
        });
      }

      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    if (!inserted?.id) {
      return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      duplicate: false,
      verification_id: inserted.id,
      message: "Scontrino caricato ✅ Ora è in revisione.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}