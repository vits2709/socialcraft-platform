import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // Cancella anche il cookie explorer
  const cookieStore = await cookies();
  cookieStore.delete("sc_uid");

  return NextResponse.json({ ok: true });
}