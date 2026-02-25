// Supabase Edge Function — Assegna missioni settimanali a tutti gli utenti
// Eseguita ogni lunedì a mezzanotte tramite cron job.
// POST con Authorization: Bearer <service_role_key>
//
// Logica:
//   1. Trova tutte le missioni settimanali attive (type='weekly')
//   2. Prende tutti gli sc_users registrati
//   3. Per ogni (utente, missione) non ancora assegnata → inserisce in user_missions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  // Authorization: Bearer <service_role_key>
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
    const now = new Date().toISOString();

    // 1. Trova tutte le missioni settimanali attive
    const { data: missions, error: mErr } = await supabase
      .from("missions")
      .select("id")
      .eq("type", "weekly")
      .eq("is_active", true)
      .lte("active_from", now)
      .gte("active_until", now);

    if (mErr) throw new Error(`missions query failed: ${mErr.message}`);
    if (!missions || missions.length === 0) {
      console.log("[assign-weekly-missions] No active weekly missions found");
      return new Response(
        JSON.stringify({ ok: true, missions_found: 0, assignments: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Prende tutti gli sc_users registrati
    const { data: users, error: uErr } = await supabase
      .from("sc_users")
      .select("id");

    if (uErr) throw new Error(`sc_users query failed: ${uErr.message}`);
    if (!users || users.length === 0) {
      console.log("[assign-weekly-missions] No users found");
      return new Response(
        JSON.stringify({ ok: true, missions_found: missions.length, assignments: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Inserisce user_missions in batch — ON CONFLICT DO NOTHING evita duplicati
    const rows = [];
    for (const mission of missions) {
      for (const user of users) {
        rows.push({
          user_id: user.id,
          mission_id: mission.id,
        });
      }
    }

    // Batch insert in chunk da 500 per evitare payload troppo grandi
    let totalInserted = 0;
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error: insErr, count } = await supabase
        .from("user_missions")
        .upsert(chunk, { onConflict: "user_id,mission_id", ignoreDuplicates: true })
        .select("id", { count: "exact", head: true });

      if (insErr) {
        console.error("[assign-weekly-missions] batch insert error:", insErr.message);
      } else {
        totalInserted += count ?? 0;
      }
    }

    console.log(
      `[assign-weekly-missions] missions=${missions.length} users=${users.length} new_assignments=${totalInserted}`
    );

    return new Response(
      JSON.stringify({
        ok: true,
        executed_at: now,
        missions_found: missions.length,
        users: users.length,
        assignments: totalInserted,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[assign-weekly-missions] Error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
