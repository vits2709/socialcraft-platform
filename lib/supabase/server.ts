import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function createClientReadOnly() {
  const cookieStore = await cookies();

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing Supabase env (URL/ANON)");

  // Snapshot subito (Next.js 16 dynamic API)
  const cookieSnapshot =
    typeof (cookieStore as any).getAll === "function"
      ? (cookieStore as any).getAll().map((c: any) => ({ name: c.name, value: c.value }))
      : [];

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieSnapshot;
      },
      setAll() {
        // NO-OP: nelle Server Components non puoi scrivere cookie
      },
    },
  });
}

// ✅ export “nuovo”
export async function createSupabaseServerClient() {
  return createClientReadOnly();
}

// ✅ export “vecchio” per compatibilità con i tuoi import esistenti
export async function createSupabaseServerClientReadOnly() {
  return createClientReadOnly();
}