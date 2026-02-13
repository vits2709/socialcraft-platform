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
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!row?.id) return NextResponse.json({ ok: false, error: "missing_verification_id" }, { status: 500 });

    return NextResponse.json({ ok: true, verification_id: row.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}