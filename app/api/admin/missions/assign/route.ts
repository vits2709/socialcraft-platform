import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/missions/assign
// Chiama l'edge function assign-daily-missions o assign-weekly-missions
// per assegnare immediatamente le missioni attive a tutti gli utenti.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const { type = "daily" } = await req.json().catch(() => ({}));

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY non configurati" },
      { status: 500 }
    );
  }

  const fnName =
    type === "weekly" ? "assign-weekly-missions" : "assign-daily-missions";

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error ?? `Edge function error ${res.status}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Errore di rete" },
      { status: 500 }
    );
  }
}
