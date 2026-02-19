import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

/** Invoca la Edge Function di validazione AI in background (non-blocking) */
async function triggerAiValidation(verificationId: string) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.functions.invoke("validate-receipt", {
      body: { verification_id: verificationId },
    });
  } catch (e) {
    // Non bloccante: se fallisce, lo scontrino rimane pending per revisione manuale
    console.error("[upload] AI validation trigger failed:", e);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(buf: ArrayBuffer) {
  return crypto.createHash("sha256").update(Buffer.from(buf)).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const form = await req.formData();
    const venueId = String(form.get("venue_id") ?? "").trim();
    const file = form.get("file") as File | null;

    if (!venueId) return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    if (!file) return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });

    const ab = await file.arrayBuffer();
    const hash = sha256(ab);

    const supabase = createSupabaseAdminClient();

    // se già esiste stesso hash per questo utente, ritorna quello
    const { data: existing, error: exErr } = await supabase
      .from("receipt_verifications")
      .select("id, status")
      .eq("user_id", scUid)
      .eq("image_hash", hash)
      .maybeSingle();

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
    if (existing?.id) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        verification_id: existing.id,
        status: existing.status,
      });
    }

    // salva su storage (bucket "receipts")
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const path = `${scUid}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("receipts").upload(path, Buffer.from(ab), {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    // inserisci verifica
    const { data: inserted, error: insErr } = await supabase
      .from("receipt_verifications")
      .insert({
        user_id: scUid,
        venue_id: venueId,
        status: "pending",
        image_path: path,
        image_hash: hash,
        points_awarded: false,
      })
      .select("id")
      .maybeSingle();

    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

    // Avvia validazione AI in background (non blocca la risposta all'utente)
    if (inserted?.id) {
      void triggerAiValidation(inserted.id);
    }

    // Marca receipt_uploaded=true nel user_event scan di oggi (best effort)
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from("user_events")
      .update({ receipt_uploaded: true })
      .eq("user_id", scUid)
      .eq("venue_id", venueId)
      .eq("event_type", "scan")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lte("created_at", `${today}T23:59:59.999Z`);

    return NextResponse.json({
      ok: true,
      duplicate: false,
      verification_id: inserted?.id,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}