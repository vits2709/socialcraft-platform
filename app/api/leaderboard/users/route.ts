import { NextResponse } from "next/server";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClientReadOnly();

  const { data, error } = await supabase
    .from("leaderboard_users")
    .select("id,name,score,meta,updated_at")
    .order("score", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] });
}