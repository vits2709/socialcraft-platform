-- Migration 022: Aggiunge colonne AI dettagliate e validation_status a receipt_verifications
-- Mantiene compatibilità con colonne esistenti (status, points_awarded boolean, ai_result, amount)

ALTER TABLE public.receipt_verifications
  ADD COLUMN IF NOT EXISTS ai_extracted_name    text,
  ADD COLUMN IF NOT EXISTS ai_extracted_date    date,
  ADD COLUMN IF NOT EXISTS ai_extracted_amount  decimal(10,2),
  ADD COLUMN IF NOT EXISTS ai_confidence        text,
  ADD COLUMN IF NOT EXISTS ai_rejection_reason  text,
  ADD COLUMN IF NOT EXISTS validation_status    text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS validated_at         timestamptz,
  ADD COLUMN IF NOT EXISTS points_amount        integer;

-- Sincronizza validation_status per record già decisi
UPDATE public.receipt_verifications
  SET validation_status = status
  WHERE status IN ('approved', 'rejected')
    AND validation_status = 'pending';
