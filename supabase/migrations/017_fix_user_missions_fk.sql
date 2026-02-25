-- Fix: user_missions.user_id deve referenziare sc_users, non auth.users.
-- sc_users può esistere senza una riga corrispondente in auth.users
-- (utenti anonimi creati via /api/bootstrap con UUID generato lato server).

ALTER TABLE public.user_missions
  DROP CONSTRAINT IF EXISTS user_missions_user_id_fkey;

ALTER TABLE public.user_missions
  ADD CONSTRAINT user_missions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.sc_users(id) ON DELETE CASCADE;
