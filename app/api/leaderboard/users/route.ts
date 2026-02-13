import { NextResponse } from "next/server";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClientReadOnly();

    // Fonte unica: sc_users.points
    const { data, error } = await supabase
      .from("sc_users")
      .select("id,name,points,updated_at")
      .order("points", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const rows = (data ?? []).map((u) => ({
      id: String(u.id),
      name: u.name ?? "Guest",
      score: Number(u.points ?? 0),
      updated_at: u.updated_at ?? null,
    }));

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}