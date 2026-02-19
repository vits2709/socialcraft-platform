-- 008_fix_ghost_accounts.sql
-- Ripara account "fantasma": utenti in auth.users che non hanno riga sc_users.
-- Capita quando il vecchio signup falliva alla step "profiles.update" (tabella inesistente).
--
-- ESEGUI questo nel Supabase SQL Editor.
-- ATTENZIONE: non imposta password_hash (non abbiamo la password in chiaro).
-- Gli utenti fixati con questo script dovranno fare "reset password" per poter
-- effettuare il login tramite /login (explorer).
-- Gli spot owner possono comunque fare login tramite /spot/login (Supabase Auth)
-- senza password_hash in sc_users.

INSERT INTO public.sc_users (id, email, name, points, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)),
  0,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.sc_users sc WHERE sc.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Verifica risultato:
-- SELECT au.id, au.email, au.created_at,
--        (sc.id IS NOT NULL) as has_sc_users
-- FROM auth.users au
-- LEFT JOIN public.sc_users sc ON sc.id = au.id
-- ORDER BY au.created_at DESC;
