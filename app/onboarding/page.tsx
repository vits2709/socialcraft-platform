import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import OnboardingClient from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const cookieStore = await cookies();
  const scUid = cookieStore.get("sc_uid")?.value?.trim();

  if (!scUid) {
    redirect("/login");
  }

  const supabase = createSupabaseAdminClient();
  const { data: user } = await supabase
    .from("sc_users")
    .select("onboarding_completed")
    .eq("id", scUid)
    .maybeSingle();

  if (user?.onboarding_completed) {
    redirect("/");
  }

  const { next } = await searchParams;
  const destination = next ?? "/";

  return <OnboardingClient destination={destination} />;
}
