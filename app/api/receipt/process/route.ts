import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createWorker } from "tesseract.js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function extractDate(text: string): string | null {
  // 08/02/2026, 08-02-26, 8.2.2026 ecc
  const m = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3];
  if (yy.length === 2) yy = `20${yy}`;
  return `${yy}-${mm}-${dd}`;
}

function extractTime(text: string): string | null {
  const m = text.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = m[1].padStart(2, "0");
  const mi = m[2];
  return `${hh}:${mi}`;
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  // ✅ FIX Next 16: cookies() è async
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;
  if (!userId) return NextResponse.json({ ok: false, error: "missing_sc_uid_cookie" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  const { data: vr, error: vrErr } = await supabase
    .from("receipt_verifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (vrErr) return NextResponse.json({ ok: false, error: vrErr.message }, { status: 500 });
  if (!vr) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (vr.user_id !== userId) return NextResponse.json({ ok: false, error: "not_allowed" }, { status: 403 });

  // se già deciso, ritorna
  if (vr.status !== "pending") {
    return NextResponse.json({ ok: true, status: vr.status, reason: vr.reason, receipt_datetime: vr.receipt_datetime });
  }

  // scarica immagine dal bucket
  const { data: file, error: dlErr } = await supabase.storage.from("receipts").download(vr.image_path);
  if (dlErr || !file) return NextResponse.json({ ok: false, error: dlErr?.message || "download_failed" }, { status: 500 });

  const buf = Buffer.from(await file.arrayBuffer());

  // OCR
  const worker = await createWorker("ita"); // prova ita; se hai problemi metti "eng"
  const { data } = await worker.recognize(buf);
  await worker.terminate();

  const text = (data?.text || "").toLowerCase();

  const d = extractDate(text);
  const t = extractTime(text);

  if (!d || !t) {
    const { error: upErr } = await supabase
      .from("receipt_verifications")
      .update({
        status: "rejected",
        reason: "missing_datetime",
        decided_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, status: "rejected", reason: "missing_datetime" });
  }

  const receiptDt = new Date(`${d}T${t}:00`);
  if (Number.isNaN(receiptDt.getTime())) {
    await supabase
      .from("receipt_verifications")
      .update({ status: "rejected", reason: "invalid_datetime", decided_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true, status: "rejected", reason: "invalid_datetime" });
  }

  // deve esserci scan recente
  const since = new Date(Date.now() - 90 * 60 * 1000).toISOString();
  const { data: lastScan, error: scanErr } = await supabase
    .from("venue_events")
    .select("created_at")
    .eq("venue_id", vr.venue_id)
    .eq("user_id", userId)
    .eq("event_type", "scan")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scanErr || !lastScan) {
    await supabase
      .from("receipt_verifications")
      .update({ status: "rejected", reason: "no_recent_scan", decided_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true, status: "rejected", reason: "no_recent_scan" });
  }

  const scanTime = new Date(lastScan.created_at).getTime();
  const diffMin = Math.abs(receiptDt.getTime() - scanTime) / (60 * 1000);

  if (diffMin > 120) {
    await supabase
      .from("receipt_verifications")
      .update({
        status: "rejected",
        reason: "datetime_too_far_from_scan",
        receipt_datetime: receiptDt.toISOString(),
        decided_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, status: "rejected", reason: "datetime_too_far_from_scan" });
  }

  // APPROVA: +10 punti
  const points = 10;

  // salva decisione
  const { error: okErr } = await supabase
    .from("receipt_verifications")
    .update({
      status: "approved",
      reason: null,
      receipt_datetime: receiptDt.toISOString(),
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (okErr) return NextResponse.json({ ok: false, error: okErr.message }, { status: 500 });

  // eventi
  await supabase.from("user_events").insert({
    user_id: userId,
    venue_id: vr.venue_id,
    event_type: "receipt_confirm",
    points,
  });

  await supabase.from("venue_events").insert({
    venue_id: vr.venue_id,
    user_id: userId,
    event_type: "confirmed_visit",
  });

  // aggiorna leaderboard_users (se il tuo RPC esiste)
  // se non esiste, dimmelo e lo facciamo via upsert diretto
  const { error: rpcErr } = await supabase.rpc("increment_user_score", {
    p_user_id: userId,
    p_points: points,
  });

  if (rpcErr) {
    // fallback: upsert su leaderboard_users
    await supabase.from("leaderboard_users").upsert(
      { id: String(userId), name: "utente", score: points },
      { onConflict: "id" }
    );

    // se già esiste, incrementa
    await supabase
      .rpc("increment_user_score_fallback", {
        p_user_id_text: String(userId),
        p_points: points,
      })
      .catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    status: "approved",
    points,
    receipt_datetime: receiptDt.toISOString(),
  });
}