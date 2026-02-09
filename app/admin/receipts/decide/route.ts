import { NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "").trim();
    const decision = String(body?.decision ?? "").trim(); // approved | rejected
    const reason = String(body?.reason ?? "").trim() || null;

    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    if (decision !== "approved" && decision !== "rejected") {
      return NextResponse.json({ ok: false, error: "invalid_decision" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("receipt_verifications")
      .update({
        status: decision,
        reason: decision === "rejected" ? reason ?? "rejected_by_admin" : null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,status,reason")
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: `update_failed:${error.message}` }, { status: 500 });

    return NextResponse.json({ ok: true, receipt: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `unexpected:${e?.message ?? "unknown"}` }, { status: 500 });
  }
}