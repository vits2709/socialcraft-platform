// Supabase Edge Function — Assegna vincitore premio settimanale
// Chiamata domenica alle 23:50 (Europe/Rome) via Schedule, oppure manualmente
// POST con Authorization: Bearer <service_role_key>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!auth.includes(serviceKey) && !auth.includes("Bearer")) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Finalizza classifica settimana precedente (aggiorna rank)
    const { error: finalizeErr } = await supabase.rpc("finalize_weekly_rankings");
    if (finalizeErr) throw new Error(`finalize failed: ${finalizeErr.message}`);

    // 2. Assegna vincitore e genera codice riscatto
    const { data: result, error: winnerErr } = await supabase.rpc("assign_weekly_winner");
    if (winnerErr) throw new Error(`assign_winner failed: ${winnerErr.message}`);

    console.log("[weekly-winner] Risultato:", JSON.stringify(result));

    return new Response(
      JSON.stringify({ ok: true, executed_at: new Date().toISOString(), result }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[weekly-winner] Errore:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
