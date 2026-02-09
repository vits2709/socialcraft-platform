import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function normLetters(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function generateLoginCode(supabase: ReturnType<typeof createSupabaseAdminClient>, firstName: string, lastName: string) {
  const fn = normLetters(firstName);
  const ln = normLetters(lastName);

  // base: 2 iniziali nome + 4 lettere cognome (o quello che c'è)
  const base = `${fn.slice(0, 2) || "x"}${ln.slice(0, 4) || "user"}`;
  let candidate = base;

  for (let i = 0; i < 200; i++) {
    const { data, error } = await supabase
      .from("sc_users")
      .select("id")
      .eq("login_code", candidate)
      .limit(1);

    if (error) throw new Error(`login_code_check_failed:${error.message}`);
    if (!data || data.length === 0) return candidate;

    // prova varianti con numero
    candidate = `${base}${i + 1}`;
  }

  // fallback raro
  return `${base}${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const firstName = String(body?.first_name ?? "").trim();
    const lastName = String(body?.last_name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "").trim();

    if (!firstName || !lastName) return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
    if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });

    const supabase = createSupabaseAdminClient();

    const loginCode = await generateLoginCode(supabase, firstName, lastName);

    // crea utente via RPC (hash password nel DB)
    const { data: userId, error } = await supabase.rpc("sc_signup", {
      p_name: `${firstName} ${lastName}`,
      p_email: email,
      p_password: password,
      p_login_code: loginCode,
    });

    if (error) {
      const msg = error.message || "signup_failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    // set cookie sc_uid = id utente
    const cookieStore = await cookies();
    cookieStore.set("sc_uid", String(userId), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365, // 1 anno
    });

    return NextResponse.json({ ok: true, user_id: userId, login_code: loginCode });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown_error" }, { status: 500 });
  }
}