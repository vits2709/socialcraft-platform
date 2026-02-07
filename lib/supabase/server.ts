import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

/**
 * ✅ Read-only client: NON scrive cookie.
 * Usalo in Server Components (page.tsx, layout.tsx, lib/auth.ts, ecc.)
 */
export async function createSupabaseServerClientReadOnly() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // 🔥 NO-OP: evita crash “Cookies can only be modified…”
      setAll() {},
    },
    global: {
      headers: {
        // opzionale ma utile dietro proxy/vercel
        "x-forwarded-host": headerStore.get("x-forwarded-host") ?? "",
        "x-forwarded-proto": headerStore.get("x-forwarded-proto") ?? "",
      },
    },
  });
}

/**
 * ✅ Write client: PUÒ scrivere cookie.
 * Usalo SOLO in Server Actions o Route Handlers.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
