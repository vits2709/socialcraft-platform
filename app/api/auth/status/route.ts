import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const adminSupabase = createSupabaseAdminClient();

  // 1) Explorer: controlla sc_uid cookie
  const cookieStore = await cookies();
  const scUid = cookieStore.get("sc_uid")?.value?.trim();
  let explorer = false;
  let name: string | null = null;
  if (scUid) {
    const { data } = await adminSupabase
      .from("sc_users")
      .select("id,name")
      .eq("id", scUid)
      .maybeSingle();
    explorer = !!data;
    name = (data as { id: string; name: string } | null)?.name ?? null;
  }

  // 2) Admin/Spot: controlla sessione Supabase Auth
  let admin = false;
  let spot = false;
  const user = await getSessionUser();
  if (user) {
    admin = await isAdmin(user.id);
    if (!admin) {
      const { data: venue } = await adminSupabase
        .from("venues")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      spot = !!venue;
    }
  }

  return NextResponse.json({ explorer, admin, spot, name });
}
