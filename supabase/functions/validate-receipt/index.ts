// Supabase Edge Function — Validazione AI scontrini
// Runtime: Deno
// Variabili d'ambiente richieste (Supabase secrets):
//   ANTHROPIC_API_KEY — chiave API Anthropic (mai nel codice sorgente)
//   SUPABASE_URL      — automaticamente iniettata da Supabase
//   SUPABASE_SERVICE_ROLE_KEY — automaticamente iniettata da Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AiExtracted {
  data: string | null;    // YYYY-MM-DD
  ora: string | null;     // HH:MM
  importo: number | null; // EUR
  locale: string | null;  // nome del locale
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set in Supabase secrets");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const verification_id = String(body?.verification_id ?? "").trim();
    if (!verification_id) return jsonResponse({ ok: false, error: "missing_verification_id" }, 400);

    // ── 1) Carica la verifica ────────────────────────────────────────────────
    const { data: verification, error: vErr } = await supabase
      .from("receipt_verifications")
      .select("id, user_id, venue_id, status, image_path, points_awarded")
      .eq("id", verification_id)
      .maybeSingle();

    if (vErr) return jsonResponse({ ok: false, error: vErr.message }, 500);
    if (!verification) return jsonResponse({ ok: false, error: "not_found" }, 404);
    if (verification.status !== "pending") {
      return jsonResponse({ ok: true, status: verification.status, already_processed: true });
    }

    // ── 2) Carica info venue ─────────────────────────────────────────────────
    const { data: venue } = await supabase
      .from("venues")
      .select("name, city")
      .eq("id", verification.venue_id)
      .maybeSingle();

    // ── 3) Scarica immagine dallo storage ────────────────────────────────────
    const { data: imgData, error: imgErr } = await supabase.storage
      .from("receipts")
      .download(verification.image_path);

    if (imgErr || !imgData) {
      return jsonResponse({ ok: false, error: `storage_download_failed: ${imgErr?.message}` }, 500);
    }

    // Converti in base64
    const arrayBuffer = await imgData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    // Media type dall'estensione
    const ext = verification.image_path.split(".").pop()?.toLowerCase() ?? "jpg";
    const mediaTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      heic: "image/jpeg", // fallback
    };
    const mediaType = mediaTypeMap[ext] ?? "image/jpeg";

    // ── 4) Analisi AI con Claude claude-haiku-4-5-20251001 ─────────────────────────────
    const prompt = `Sei un assistente per la verifica di scontrini italiani.
Analizza questa immagine e restituisci SOLO un oggetto JSON valido (nessun markdown, nessun testo aggiuntivo) con questi campi:
- "data": data dello scontrino nel formato YYYY-MM-DD (o null se non leggibile)
- "ora": orario nel formato HH:MM (o null se non leggibile)
- "importo": importo totale in EUR come numero decimale (es: 12.50, o null se non leggibile)
- "locale": nome del locale/esercizio commerciale come scritto sullo scontrino (o null)

Esempio risposta corretta: {"data":"2024-01-15","ora":"20:30","importo":15.50,"locale":"Bar Roma"}
Se l'immagine non è chiaramente uno scontrino: {"data":null,"ora":null,"importo":null,"locale":null}`;

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      throw new Error(`Anthropic API error ${anthropicResp.status}: ${errText.slice(0, 300)}`);
    }

    const anthropicJson = await anthropicResp.json();
    const rawText = String(anthropicJson?.content?.[0]?.text ?? "");

    // Parse JSON dalla risposta AI (rimuovi eventuali code block markdown)
    let extracted: AiExtracted = { data: null, ora: null, importo: null, locale: null };
    try {
      const cleaned = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch {
      // AI non ha restituito JSON valido → tutto null, andrà in revisione manuale
    }

    // ── 5) Validazione regole ────────────────────────────────────────────────
    const reasons: string[] = [];
    let autoApprove = true;

    // Regola A: Importo minimo €3
    const importo = typeof extracted.importo === "number" ? extracted.importo : null;
    if (importo === null) {
      reasons.push("importo_non_leggibile");
      autoApprove = false;
    } else if (importo < 3) {
      reasons.push(`importo_insufficiente:€${importo}`);
      autoApprove = false;
    }

    // Regola B: Data scontrino = giorno check-in utente per questa venue
    if (extracted.data) {
      const receiptDate = extracted.data; // YYYY-MM-DD
      const start = `${receiptDate}T00:00:00.000Z`;
      const end = `${receiptDate}T23:59:59.999Z`;

      const { count: scanCount } = await supabase
        .from("user_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", verification.user_id)
        .eq("venue_id", verification.venue_id)
        .eq("event_type", "scan")
        .gte("created_at", start)
        .lte("created_at", end);

      if ((scanCount ?? 0) === 0) {
        reasons.push(`no_checkin_on_receipt_date:${receiptDate}`);
        autoApprove = false;
      }
    } else {
      reasons.push("data_non_leggibile");
      autoApprove = false;
    }

    // Regola C: Nome locale corrisponde allo spot (fuzzy, case-insensitive)
    if (extracted.locale && venue?.name) {
      const aiLocale = extracted.locale.toLowerCase().trim();
      const venueName = venue.name.toLowerCase().trim();

      // Cerca sovrapposizione: substring o parole significative in comune
      const aiWords = aiLocale.split(/\s+/).filter((w: string) => w.length > 2);
      const venueWords = venueName.split(/\s+/).filter((w: string) => w.length > 2);
      const hasMatch =
        aiLocale.includes(venueName) ||
        venueName.includes(aiLocale) ||
        aiWords.some((w: string) => venueWords.some((vw: string) => vw.includes(w) || w.includes(vw)));

      if (!hasMatch) {
        reasons.push(`locale_mismatch:ai="${extracted.locale}",spot="${venue.name}"`);
        autoApprove = false;
      }
    } else if (!extracted.locale) {
      reasons.push("locale_non_leggibile");
      autoApprove = false;
    }

    // ── 6) Aggiorna la DB ────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const reasonStr = reasons.length > 0 ? reasons.join("; ") : null;

    const updatePayload: Record<string, unknown> = {
      ai_result: { extracted, reasons, auto_approved: autoApprove },
      ai_checked_at: now,
    };

    if (autoApprove) {
      updatePayload.status = "approved";
      updatePayload.decided_at = now;
      // reason rimane null se tutto ok
    } else {
      // Lascia pending per revisione manuale, salva il motivo
      updatePayload.reason = reasonStr;
    }

    const { error: upErr } = await supabase
      .from("receipt_verifications")
      .update(updatePayload)
      .eq("id", verification_id);

    if (upErr) return jsonResponse({ ok: false, error: upErr.message }, 500);

    // ── 7) Se auto-approvato: assegna punti atomicamente ────────────────────
    if (autoApprove) {
      const AWARD = 8;

      const { data: flagged, error: flagErr } = await supabase
        .from("receipt_verifications")
        .update({ points_awarded: true })
        .eq("id", verification_id)
        .eq("points_awarded", false)
        .select("id")
        .maybeSingle();

      if (!flagErr && flagged) {
        const { data: uRow } = await supabase
          .from("sc_users")
          .select("points")
          .eq("id", verification.user_id)
          .maybeSingle();

        const newTotal = ((uRow?.points ?? 0) as number) + AWARD;

        await supabase
          .from("sc_users")
          .update({ points: newTotal, updated_at: now })
          .eq("id", verification.user_id);

        await supabase.from("user_events").insert({
          user_id: verification.user_id,
          venue_id: verification.venue_id,
          event_type: "receipt",
          points: AWARD,
          points_delta: AWARD,
        });

        // Incrementa score venue nella leaderboard
        if (venue?.name) {
          await supabase.rpc("increment_venue_score_uuid", {
            p_venue_id: verification.venue_id,
            p_points: AWARD,
            p_name: venue.name,
            p_meta: venue.city ? `city=${venue.city}` : null,
          });
        }
      }
    }

    return jsonResponse({
      ok: true,
      status: autoApprove ? "approved" : "pending",
      auto_approved: autoApprove,
      extracted,
      reasons,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[validate-receipt]", msg);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
