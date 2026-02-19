-- 009_checkin_session_fields.sql
-- Aggiunge campi di sessione checkin a user_events per gli eventi di tipo "scan".
-- geo_verified: se il GPS ha confermato la presenza entro 100m
-- receipt_uploaded: se l'utente ha caricato uno scontrino in questa sessione
-- voted: se l'utente ha votato lo spot in questa sessione

ALTER TABLE public.user_events
  ADD COLUMN IF NOT EXISTS geo_verified     boolean,
  ADD COLUMN IF NOT EXISTS receipt_uploaded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS voted            boolean DEFAULT false;

-- Retroattivamente: i vecchi scan con points=2 erano geo_verified, con points=1 no
UPDATE public.user_events
SET geo_verified = (points >= 2)
WHERE event_type = 'scan' AND geo_verified IS NULL;
