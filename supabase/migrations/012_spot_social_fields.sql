-- Aggiunge campi social media e immagine di copertina alla tabella venues
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS cover_image text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS facebook text;
