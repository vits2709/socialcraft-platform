"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function cleanName(raw: string) {
  const s = String(raw ?? "").trim().replace(/\s+/g, " ");
  // regole base: 2-24 char
  if (s.length < 2) throw new Error("name_too_short");
  if (s.length > 24) throw new Error("name_too_long");
  return s;
}

export async function updateMyNameAction(formData: FormData): Promise<void> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("sc_uid")?.value;
  if (!userId) throw new Error("missing_sc_uid_cookie");

  const name = cleanName(String(formData.get("name") ?? ""));

  const supabase = createSupabaseAdminClient();

  // upsert su leaderboard_users (id = sc_uid)
  const { error } = await supabase
    .from("leaderboard_users")
    .upsert(
      {
        id: String(userId),
        name,
        // non tocchiamo score, meta: lasciamo quelli esistenti
      },
      { onConflict: "id" }
    );

  if (error) throw new Error(error.message);

  revalidatePath("/me");
  revalidatePath("/");
  redirect("/me");
}