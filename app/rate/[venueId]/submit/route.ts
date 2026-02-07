import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request, { params }: { params: { venueId: string } }) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const ratingRaw = String(form.get("rating") ?? "");
  const note = String(form.get("note") ?? "").slice(0, 280);

  const rating = Number(ratingRaw);
  if (!token) {
    return NextResponse.redirect(new URL(`/rate/${params.venueId}`, req.url), 303);
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.redirect(new URL(`/rate/${params.venueId}?t=${encodeURIComponent(token)}`, req.url), 303);
  }

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: "Missing env" }, { status: 500 });
  }

  const supabase = createClient(url, anon, { auth: { persistSession: false } });

  const { error } = await supabase.rpc("submit_vote_with_token", {
    p_venue_id: params.venueId,
    p_token: token,
    p_rating: rating,
    p_note: note.length ? note : null,
  });

  // Se token scaduto/usato, torniamo alla pagina senza token (messaggio "scannerizza di nuovo")
  if (error) {
    return NextResponse.redirect(new URL(`/rate/${params.venueId}`, req.url), 303);
  }

  return NextResponse.redirect(new URL(`/rate/${params.venueId}`, req.url), 303);
}
