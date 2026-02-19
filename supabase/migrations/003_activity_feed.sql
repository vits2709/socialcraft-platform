-- ══════════════════════════════════════════════════════════════
-- PRIORITÀ 4: Feed sociale delle attività utenti
-- ══════════════════════════════════════════════════════════════

-- Tabella feed attività
create table if not exists public.activity_feed (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,          -- sc_uid dell'utente
  event_type  text not null,          -- checkin | receipt_approved | badge_unlocked | rank_up
  venue_id    uuid references public.venues(id) on delete set null,
  venue_name  text,                   -- snapshot nome venue al momento dell'evento
  user_name   text,                   -- snapshot nickname utente
  meta        jsonb,                  -- payload extra (badge_name, old_rank, new_rank, points, ...)
  created_at  timestamptz not null default now()
);

-- Indice per ordinamento cronologico
create index if not exists idx_activity_feed_created_at on public.activity_feed(created_at desc);
-- Indice per query per utente
create index if not exists idx_activity_feed_user_id on public.activity_feed(user_id);

-- RLS
alter table public.activity_feed enable row level security;

-- Feed pubblico in lettura
create policy "activity_feed_select_public" on public.activity_feed
  for select using (true);

-- Solo service role può inserire (tramite server actions e trigger)
create policy "activity_feed_insert_service" on public.activity_feed
  for insert with check (true);

-- ── Funzione trigger: check-in ─────────────────────────────────────────────
-- Si attiva quando viene inserito un evento scan in user_events

create or replace function public.trigger_feed_on_scan()
returns trigger language plpgsql security definer as $$
declare
  v_venue_name text;
  v_user_name  text;
begin
  -- Prendi nome venue
  select name into v_venue_name from public.venues where id = NEW.venue_id;
  -- Prendi nome utente
  select name into v_user_name from public.sc_users where id = NEW.user_id;

  insert into public.activity_feed(user_id, event_type, venue_id, venue_name, user_name, meta)
  values (
    NEW.user_id,
    'checkin',
    NEW.venue_id,
    coalesce(v_venue_name, 'Spot'),
    coalesce(v_user_name, 'Esploratore'),
    jsonb_build_object('points', coalesce(NEW.points_delta, 2))
  );

  return NEW;
end;
$$;

-- Trigger su user_events per i check-in
drop trigger if exists feed_on_scan on public.user_events;
create trigger feed_on_scan
  after insert on public.user_events
  for each row
  when (NEW.event_type = 'scan')
  execute function public.trigger_feed_on_scan();

-- ── Funzione trigger: scontrino approvato ─────────────────────────────────

create or replace function public.trigger_feed_on_receipt_approved()
returns trigger language plpgsql security definer as $$
declare
  v_venue_name text;
  v_user_name  text;
begin
  -- Si attiva solo quando lo stato passa a 'approved'
  if NEW.status = 'approved' and (OLD.status is distinct from 'approved') then
    select name into v_venue_name from public.venues where id = NEW.venue_id;
    select name into v_user_name from public.sc_users where id = NEW.user_id;

    insert into public.activity_feed(user_id, event_type, venue_id, venue_name, user_name, meta)
    values (
      NEW.user_id,
      'receipt_approved',
      NEW.venue_id,
      coalesce(v_venue_name, 'Spot'),
      coalesce(v_user_name, 'Esploratore'),
      jsonb_build_object(
        'points', 8,
        'importo', coalesce((NEW.ai_result -> 'extracted' ->> 'importo')::numeric, null)
      )
    );
  end if;

  return NEW;
end;
$$;

-- Trigger su receipt_verifications
drop trigger if exists feed_on_receipt_approved on public.receipt_verifications;
create trigger feed_on_receipt_approved
  after update on public.receipt_verifications
  for each row
  execute function public.trigger_feed_on_receipt_approved();

-- ── View pubblica semplificata (ultimi 100 eventi) ─────────────────────────
create or replace view public.v_activity_feed as
select
  af.id,
  af.user_id,
  af.event_type,
  af.venue_id,
  af.venue_name,
  af.user_name,
  af.meta,
  af.created_at,
  v.slug as venue_slug
from public.activity_feed af
left join public.venues v on v.id = af.venue_id
order by af.created_at desc
limit 100;
