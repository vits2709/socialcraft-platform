-- 023_companion_nullable_geo.sql
-- Rende opzionali le coordinate del creator in companion_codes.
-- Necessario per venue senza coordinate GPS (lat/lng null).
-- Il proximity check nel join viene saltato quando creator_lat/lng è null.

ALTER TABLE companion_codes
  ALTER COLUMN creator_lat DROP NOT NULL,
  ALTER COLUMN creator_lng DROP NOT NULL;
