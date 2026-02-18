import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Auth check via server client (cookies)
  const serverClient = await createSupabaseServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const formData = await req.formData();
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!venueId || !file) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `${venueId}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const supabase = createSupabaseAdminClient();

  const { error: upErr } = await supabase.storage
    .from("spot-photos")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: urlData } = supabase.storage
    .from("spot-photos")
    .getPublicUrl(fileName);

  return NextResponse.json({ url: urlData.publicUrl });
}
