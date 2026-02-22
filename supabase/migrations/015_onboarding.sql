-- 015_onboarding.sql
-- Aggiunge flag onboarding_completed a sc_users.
-- Default false → al primo login viene mostrato l'onboarding.
-- Viene impostato a true quando l'utente completa o salta l'onboarding.

ALTER TABLE public.sc_users
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
