import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sha256(buf: ArrayBuffer) {
  const h = crypto.createHash("sha256");
  h.update(Buffer.from(buf));
  return h.digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    const scUid = req.cookies.get("sc_uid")?.value?.trim();
    if (!scUid) return NextResponse.json({ ok: false, error: "not_logged" }, { status: 401 });

    const fd = await req.formData();
    const venueId = String(fd.get("venue_id") ?? "").trim();
    const file = fd.get("file");

    if (!venueId) return NextResponse.json({ ok: false, error: "missing_venue_id" }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });

    const ab = await file.arrayBuffer();
    const hash = await sha256(ab);

    // image_path: placeholder stabile (se poi aggiungi storage, lo sostituiamo)
    const imagePath = `receipts/${scUid}/${Date.now()}_${file.name}`;

    const { data: row, error } = await supabase
      .from("receipt_verifications")
      .insert({
        user_id: scUid,
        venue_id: venueId,
        status: "pending",
        image_path: imagePath,
        image_hash: hash,
      })
      // ... dopo che hai: user_id, venue_id, image_path, image_hash

const { data: inserted, error: insErr } = await supabase
  .from("receipt_verifications")
  .insert({
    user_id,
    venue_id,
    status: "pending",
    image_path,
    image_hash,
  })
  .select("id,status,reason")
  .maybeSingle();

if (insErr) {
  // duplicate key -> stessa immagine già caricata da questo utente
  if ((insErr as any).code === "23505") {
    const { data: existing, error: selErr } = await supabase
      .from("receipt_verifications")
      .select("id,status,reason")
      .eq("user_id", user_id)
      .eq("image_hash", image_hash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ ok: false, error: "duplicate_but_not_found" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      duplicate: true,
      verification_id: existing.id,
      status: existing.status,
      message:
        existing.status === "pending"
          ? "Questo scontrino è già stato caricato ✅ (è ancora in revisione)."
          : existing.status === "approved"
          ? "Questo scontrino era già stato approvato ✅"
          : "Questo scontrino era già stato rifiutato ❌",
    });
  }

  return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
}

// normale
return NextResponse.json({
  ok: true,
  duplicate: false,
  verification_id: inserted?.id,
});