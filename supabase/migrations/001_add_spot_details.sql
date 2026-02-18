-- Migration: Add spot details columns to venues table
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS indirizzo text,
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS orari jsonb,
  ADD COLUMN IF NOT EXISTS sito_web text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS servizi text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fascia_prezzo int CHECK (fascia_prezzo IN (1,2,3)),
  ADD COLUMN IF NOT EXISTS foto text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lat float8,
  ADD COLUMN IF NOT EXISTS lng float8,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Bucket "spot-photos" deve essere creato manualmente nel Supabase Dashboard:
-- Storage → New bucket → name: spot-photos → Public: true
