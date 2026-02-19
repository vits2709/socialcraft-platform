// Supabase Edge Function — Reset classifica settimanale
// Chiamata ogni lunedì alle 00:05 (via Supabase Dashboard → Edge Functions → Schedule)
// Oppure manualmente via POST con Authorization: Bearer <service_role_key>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  // Verifica autorizzazione (service role key come Bearer token)
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
    // 1. Finalizza la settimana precedente (aggiorna rank)
    const { error: finalizeErr } = await supabase.rpc("finalize_weekly_rankings");
    if (finalizeErr) throw new Error(`finalize failed: ${finalizeErr.message}`);

    // 2. Log dell'esecuzione
    console.log(`[weekly-reset] Eseguito ${new Date().toISOString()}`);

    return new Response(
      JSON.stringify({ ok: true, executed_at: new Date().toISOString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[weekly-reset] Errore:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
