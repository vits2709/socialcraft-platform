-- Abilita pg_net (necessario per chiamate HTTP outbound dalle edge functions)
-- I cron job sono configurati tramite supabase/config.toml (schedule nelle functions)
-- e vengono attivati automaticamente al deploy con: supabase functions deploy
CREATE EXTENSION IF NOT EXISTS pg_net;
