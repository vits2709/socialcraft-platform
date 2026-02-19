-- ══════════════════════════════════════════════════════════════
-- PRIORITÀ 5: Notifiche Push — subscriptions utenti
-- ══════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,               -- sc_uid
  endpoint     text not null unique,        -- URL endpoint push
  p256dh       text not null,               -- chiave pubblica ECDH
  auth         text not null,               -- chiave auth
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);

-- RLS
alter table public.push_subscriptions enable row level security;

-- Solo service role può accedere (gestito lato server)
create policy "push_subscriptions_service_only" on public.push_subscriptions
  for all using (true);
