-- ============================================================
-- 020 — Cron job per assegnazione automatica missioni
-- ============================================================
-- PREREQUISITI: pg_net abilitato (migration 018), pg_cron abilitato
--               Eseguire nel Dashboard Supabase → SQL Editor
--
-- Sostituire:
--   <YOUR_PROJECT_URL>          → es. https://avqnelunisrsrjuqrgwc.supabase.co
--   <YOUR_SERVICE_ROLE_KEY>     → Settings → API → service_role (secret)
-- ============================================================

-- Abilita pg_cron (richiede abilitazione da Supabase Dashboard →
-- Database → Extensions → pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Missioni GIORNALIERE — ogni giorno alle 00:01 UTC ────────────────────────
SELECT cron.schedule(
  'assign-daily-missions',   -- nome job (univoco)
  '1 0 * * *',               -- cron expression: ogni giorno 00:01 UTC
  $$
    SELECT net.http_post(
      url     := '<YOUR_PROJECT_URL>/functions/v1/assign-daily-missions',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ── Missioni SETTIMANALI — ogni lunedì alle 00:05 UTC ───────────────────────
SELECT cron.schedule(
  'assign-weekly-missions',  -- nome job
  '5 0 * * 1',               -- cron expression: ogni lunedì 00:05 UTC
  $$
    SELECT net.http_post(
      url     := '<YOUR_PROJECT_URL>/functions/v1/assign-weekly-missions',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ── Verifica job creati ──────────────────────────────────────────────────────
-- SELECT jobname, schedule, command FROM cron.job;

-- ── Per rimuovere i job (se necessario) ─────────────────────────────────────
-- SELECT cron.unschedule('assign-daily-missions');
-- SELECT cron.unschedule('assign-weekly-missions');
