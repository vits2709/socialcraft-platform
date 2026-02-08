import { cookies } from "next/headers";

/**
 * Helper per Server Actions / Route Handlers:
 * in Next 16 `cookies()` è async e puoi settare cookie SOLO lì.
 */
export async function getCookieStore() {
  return await cookies();
}

/**
 * Snapshot “safe” dei cookie (array {name,value}) utile per Supabase SSR.
 * In Next 16, facciamo snapshot una volta e lo usiamo.
 */
export async function getCookieSnapshot(): Promise<{ name: string; value: string }[]> {
  const cookieStore: any = await cookies();

  if (typeof cookieStore.getAll === "function") {
    return cookieStore.getAll().map((c: any) => ({ name: c.name, value: c.value }));
  }

  // fallback ultra-safe (se getAll non esiste)
  return [];
}