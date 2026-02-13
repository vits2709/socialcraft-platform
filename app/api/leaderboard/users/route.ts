import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseAdminClient();

  // ✅ Source of truth: sc_users.points
  const { data, error } = await supabase
    .from("sc_users")
    .select("id, name, full_name, points, updated_at")
    .order("points", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data ?? []).map((u) => ({
    id: String(u.id), // leaderboard usa string
    name: (u.full_name?.trim() || u.name?.trim() || "Guest") as string,
    score: Number(u.points ?? 0),
    meta: null,
    updated_at: u.updated_at ?? null,
  }));

  return NextResponse.json({ ok: true, rows });
}