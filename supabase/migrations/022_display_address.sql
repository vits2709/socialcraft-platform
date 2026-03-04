-- ── Aggiunge display_address alla tabella venues ───────────────────────────
-- Campo separato per l'indirizzo leggibile mostrato all'utente.
-- `indirizzo` resta usato per il geocoding / coordinate GPS.
-- `display_address` è il fallback testuale visibile nella pagina pubblica.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS display_address text;
