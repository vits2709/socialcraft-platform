// Supabase Edge Function — Validazione AI scontrini
// Runtime: Deno
// Variabili d'ambiente richieste (Supabase secrets):
//   ANTHROPIC_API_KEY         — chiave API Anthropic
//   SUPABASE_URL              — auto-iniettata da Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-iniettata da Supabase
//   SITE_URL                  — URL base del sito (per push notifications)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AiExtracted {
  nome_locale:     string | null;
  data:            string | null; // YYYY-MM-DD
  ora:             string | null; // HH:MM
  importo_totale:  number | null;
  tipo_esercizio:  string | null;
  confidence:      "high" | "medium" | "low" | null;
}

type ValidationOutcome = "auto_approved" | "auto_rejected" | "manual_review";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

/** Punti proporzionali all'importo scontrino */
function calculatePoints(amount: number): number {
  if (amount < 5)  return 4;
  if (amount < 15) return 8;
  if (amount < 30) return 12;
  if (amount < 50) return 18;
  return 25;
}

/** Fuzzy match tra nome AI e nome venue */
function nameMatches(aiLocale: string, venueName: string): boolean {
  const ai    = aiLocale.toLowerCase().trim();
  const venue = venueName.toLowerCase().trim();
  if (ai.includes(venue) || venue.includes(ai)) return true;
  const aiWords    = ai.split(/\s+/).filter((w: string) => w.length > 2);
  const venueWords = venue.split(/\s+/).filter((w: string) => w.length > 2);
  return aiWords.some((w: string) =>
    venueWords.some((vw: string) => vw.includes(w) || w.includes(vw))
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY non configurata");

    const SUPABASE_URL           = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SITE_URL               = Deno.env.get("SITE_URL") ?? "";

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
      // Fallback: vai in manual_review invece di bloccare l'utente
      await supabase.from("receipt_verifications").update({
        validation_status:   "manual_review",
        ai_rejection_reason: "Errore download immagine",
        ai_checked_at:       new Date().toISOString(),
      }).eq("id", verification_id);
      return jsonResponse({ ok: false, error: `storage_download_failed: ${imgErr?.message}` }, 500);
    }

    // Converti in base64 (chunk-based per evitare timeout su immagini grandi)
    const arrayBuffer = await imgData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const CHUNK = 8192;
    const parts: string[] = [];
    for (let i = 0; i < uint8.length; i += CHUNK) {
      parts.push(String.fromCharCode(...uint8.subarray(i, i + CHUNK)));
    }
    const base64 = btoa(parts.join(""));

    const ext = verification.image_path.split(".").pop()?.toLowerCase() ?? "jpg";
    const mediaTypeMap: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg",
      png: "image/png", webp: "image/webp",
      gif: "image/gif", heic: "image/jpeg",
    };
    const mediaType = mediaTypeMap[ext] ?? "image/jpeg";

    // ── 4) Analisi AI con Claude Haiku (timeout 30s) ─────────────────────────
    const prompt = `Analizza questo scontrino italiano ed estrai le seguenti informazioni in formato JSON:
{
  "nome_locale": "nome dell'esercizio commerciale",
  "data": "YYYY-MM-DD",
  "ora": "HH:MM",
  "importo_totale": 0.00,
  "tipo_esercizio": "bar|ristorante|barber|parrucchiere|estetica|altro",
  "confidence": "high|medium|low"
}

- confidence "high": tutti i campi chiari e leggibili
- confidence "medium": alcuni campi incerti o parzialmente leggibili
- confidence "low": immagine illeggibile, sfocata o non è uno scontrino

Rispondi SOLO con il JSON, nessun testo aggiuntivo.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let extracted: AiExtracted = {
      nome_locale: null, data: null, ora: null,
      importo_totale: null, tipo_esercizio: null, confidence: null,
    };
    let aiCallFailed = false;

    try {
      const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type":    "application/json",
          "x-api-key":       ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: prompt },
            ],
          }],
        }),
      });

      if (anthropicResp.ok) {
        const anthropicJson = await anthropicResp.json();
        const rawText = String(anthropicJson?.content?.[0]?.text ?? "");
        try {
          const cleaned = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
          extracted = JSON.parse(cleaned);
        } catch {
          // JSON non valido → andrà in manual_review (confidence rimane null)
          console.error("[validate-receipt] JSON parse failed, rawText:", rawText.slice(0, 200));
        }
      } else {
        aiCallFailed = true;
        const errBody = await anthropicResp.text().catch(() => "(no body)");
        console.error("[validate-receipt] Anthropic API error", anthropicResp.status, errBody.slice(0, 300));
      }
    } catch (e) {
      // Timeout o errore rete
      aiCallFailed = true;
      console.error("[validate-receipt] fetch exception:", e instanceof Error ? e.message : String(e));
    } finally {
      clearTimeout(timeoutId);
    }

    const now = new Date().toISOString();

    // ── 5) Logica di validazione ─────────────────────────────────────────────
    let outcome: ValidationOutcome = "auto_approved";
    let rejectionReason: string | null = null;

    // Regola 1: AI call fallita → manual_review (non rifiuto: potrebbe essere problema tecnico)
    if (aiCallFailed) {
      outcome = "manual_review";
      rejectionReason = "Errore analisi AI — revisione manuale richiesta";
    }

    // Regola 1b: confidence low → rifiuto automatico
    if (outcome === "auto_approved" && (extracted.confidence === "low" || extracted.confidence === null)) {
      outcome = "auto_rejected";
      rejectionReason = "Immagine non leggibile o non è uno scontrino";
    }

    // Regola 2: importo < €1 → rifiuto automatico
    const importo = typeof extracted.importo_totale === "number" ? extracted.importo_totale : null;
    if (outcome === "auto_approved") {
      if (importo === null) {
        outcome = "manual_review";
        rejectionReason = "Importo non leggibile";
      } else if (importo < 1) {
        outcome = "auto_rejected";
        rejectionReason = `Importo troppo basso (€${importo.toFixed(2)})`;
      }
    }

    // Regola 3: data scontrino non corrisponde alla visita (tolleranza 24h)
    if (outcome === "auto_approved" && extracted.data) {
      const receiptDate = extracted.data;
      const receiptTs = new Date(receiptDate).getTime();
      const start = new Date(receiptTs - 24 * 3600 * 1000).toISOString();
      const end   = new Date(receiptTs + 48 * 3600 * 1000).toISOString();

      const { count: scanCount } = await supabase
        .from("user_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", verification.user_id)
        .eq("venue_id", verification.venue_id)
        .eq("event_type", "scan")
        .gte("created_at", start)
        .lte("created_at", end);

      if ((scanCount ?? 0) === 0) {
        outcome = "auto_rejected";
        rejectionReason = "Data scontrino non corrisponde alla visita";
      }
    } else if (outcome === "auto_approved" && !extracted.data) {
      outcome = "manual_review";
      rejectionReason = "Data non leggibile";
    }

    // Regola 4: nome locale non corrisponde → manual_review (non rifiuto)
    if (outcome === "auto_approved" && extracted.nome_locale && venue?.name) {
      if (!nameMatches(extracted.nome_locale, venue.name)) {
        outcome = "manual_review";
        rejectionReason = `Nome locale non corrisponde: AI="${extracted.nome_locale}", spot="${venue.name}"`;
      }
    } else if (outcome === "auto_approved" && !extracted.nome_locale) {
      outcome = "manual_review";
      rejectionReason = "Nome locale non leggibile";
    }

    // Regola 5: confidence medium → manual_review anche se altri check ok
    if (outcome === "auto_approved" && extracted.confidence === "medium") {
      outcome = "manual_review";
      rejectionReason = "Alcuni campi incerti — revisione manuale richiesta";
    }

    // ── 6) Aggiorna DB ───────────────────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      ai_result:          { extracted, reasons: rejectionReason ? [rejectionReason] : [], auto_approved: outcome === "auto_approved" },
      ai_checked_at:      now,
      ai_extracted_name:  extracted.nome_locale ?? null,
      ai_extracted_date:  extracted.data ?? null,
      ai_extracted_amount: importo ?? null,
      ai_confidence:      extracted.confidence ?? null,
      ai_rejection_reason: rejectionReason,
    };

    if (outcome === "auto_approved") {
      updatePayload.status            = "approved";
      updatePayload.validation_status = "approved";
      updatePayload.decided_at        = now;
      updatePayload.validated_at      = now;
    } else if (outcome === "auto_rejected") {
      updatePayload.status            = "rejected";
      updatePayload.validation_status = "rejected";
      updatePayload.decided_at        = now;
      updatePayload.validated_at      = now;
      updatePayload.reason            = rejectionReason;
    } else {
      // manual_review: status rimane "pending" per compatibilità con process route
      updatePayload.validation_status = "manual_review";
      updatePayload.reason            = rejectionReason;
    }

    const { error: upErr } = await supabase
      .from("receipt_verifications")
      .update(updatePayload)
      .eq("id", verification_id);

    if (upErr) return jsonResponse({ ok: false, error: upErr.message }, 500);

    // ── 7) Se auto-approvato: assegna punti proporzionali ───────────────────
    let awardedPoints = 0;
    if (outcome === "auto_approved" && importo !== null) {
      awardedPoints = calculatePoints(importo);

      const { data: flagged, error: flagErr } = await supabase
        .from("receipt_verifications")
        .update({ points_awarded: true, points_amount: awardedPoints })
        .eq("id", verification_id)
        .eq("points_awarded", false) // guard atomico
        .select("id")
        .maybeSingle();

      if (!flagErr && flagged) {
        const { data: uRow } = await supabase
          .from("sc_users").select("points").eq("id", verification.user_id).maybeSingle();

        const newTotal = ((uRow?.points ?? 0) as number) + awardedPoints;

        await supabase.from("sc_users")
          .update({ points: newTotal, updated_at: now })
          .eq("id", verification.user_id);

        await supabase.from("user_events").insert({
          user_id:     verification.user_id,
          venue_id:    verification.venue_id,
          event_type:  "receipt",
          points:      awardedPoints,
          points_delta: awardedPoints,
        });

        if (venue?.name) {
          await supabase.rpc("increment_venue_score_uuid", {
            p_venue_id: verification.venue_id,
            p_points:   awardedPoints,
            p_name:     venue.name,
            p_meta:     venue.city ? `city=${venue.city}` : null,
          });
        }
      }
    }

    // ── 8) Notifiche push via relay interno ──────────────────────────────────
    if (SITE_URL) {
      let notifTitle = "";
      let notifBody  = "";

      if (outcome === "auto_approved") {
        notifTitle = "🧾 Scontrino approvato!";
        notifBody  = `+${awardedPoints} punti guadagnati`;
      } else if (outcome === "manual_review") {
        notifTitle = "🧾 Scontrino in revisione";
        notifBody  = "Riceverai i punti a breve";
      } else {
        notifTitle = "❌ Scontrino non valido";
        notifBody  = rejectionReason ?? "Scontrino rifiutato";
      }

      fetch(`${SITE_URL}/api/internal/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_id: verification.user_id,
          type:    "prize_won",
          title:   notifTitle,
          body:    notifBody,
        }),
      }).catch(() => {});
    }

    return jsonResponse({
      ok:           true,
      outcome,
      status:       updatePayload.status ?? "pending",
      auto_approved: outcome === "auto_approved",
      extracted,
      rejection_reason: rejectionReason,
      points_awarded: awardedPoints,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[validate-receipt]", msg);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
