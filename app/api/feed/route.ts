import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("v_activity_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
