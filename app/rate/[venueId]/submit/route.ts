import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ venueId: string }> }
) {
  try {
    const { venueId } = await context.params;

    if (!venueId) {
      return NextResponse.json({ error: "missing_venueId" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    // Qui adatta ai tuoi campi reali:
    // esempio tipico: token + rating
    const token = String(body.token ?? "").trim();
    const rating = Number(body.rating ?? 0);

    if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "invalid_rating" }, { status: 400 });
    }

    // Server-side: usa service role (admin client) perché stai validando token + scrivendo voto
    const supabase = createSupabaseAdminClient();

    // Se tu hai già una RPC che fa tutto (consigliato), usa quella.
    // Esempio: submit_vote_token(p_venue_id, p_token, p_rating)
    const { data, error } = await supabase.rpc("submit_vote_token", {
      p_venue_id: venueId,
      p_token: token,
      p_rating: rating,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, result: data ?? null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}