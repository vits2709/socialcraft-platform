import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = String(searchParams.get("slug") ?? "").trim();

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "missing_slug" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("venues")
    .select("id,name,city,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    venue: data,
  });
}