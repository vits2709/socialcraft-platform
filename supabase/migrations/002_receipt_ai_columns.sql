-- Aggiunge colonne per la verifica AI degli scontrini
-- ai_result: risultato grezzo dell'analisi AI (extracted, reasons, auto_approved)
-- ai_checked_at: timestamp dell'ultima analisi AI

alter table public.receipt_verifications
  add column if not exists ai_result jsonb,
  add column if not exists ai_checked_at timestamptz;

comment on column public.receipt_verifications.ai_result is
  'Risultato analisi AI: { extracted: { data, ora, importo, locale }, reasons: [], auto_approved: bool }';
comment on column public.receipt_verifications.ai_checked_at is
  'Timestamp ultima analisi AI';
