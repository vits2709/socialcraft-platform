-- ══════════════════════════════════════════════════════════════
-- PRIORITÀ 6: Classifiche Settimanali + Premi
-- ══════════════════════════════════════════════════════════════

-- Tabella classifica settimanale esploratori
create table if not exists public.weekly_rankings (
  id              uuid primary key default gen_random_uuid(),
  week_start      date not null,        -- lunedì di inizio settimana (YYYY-MM-DD)
  user_id         text not null,        -- sc_uid
  user_name       text,                 -- snapshot nickname
  points_week     integer not null default 0,  -- punti accumulati in questa settimana
  rank            integer,              -- posizione nella classifica (aggiornata a fine settimana)
  sponsor_spot_id uuid references public.venues(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(week_start, user_id)
);

create index if not exists idx_weekly_rankings_week_start on public.weekly_rankings(week_start, points_week desc);
create index if not exists idx_weekly_rankings_user on public.weekly_rankings(user_id);

-- RLS
alter table public.weekly_rankings enable row level security;
create policy "weekly_rankings_select_public" on public.weekly_rankings for select using (true);
create policy "weekly_rankings_write_service" on public.weekly_rankings for all using (true);

-- ── Funzione: ottieni lunedì della settimana corrente ─────────────────────

create or replace function public.current_week_start()
returns date language sql stable as $$
  select date_trunc('week', now() at time zone 'Europe/Rome')::date;
$$;

-- ── Funzione: aggiungi punti settimanali a un utente ─────────────────────
-- Chiamata ogni volta che l'utente guadagna punti

create or replace function public.add_weekly_points(
  p_user_id text,
  p_points  integer,
  p_user_name text default null
)
returns void language plpgsql security definer as $$
declare
  v_week date := public.current_week_start();
  v_name text;
begin
  -- Usa il nome passato o caricalo dal DB
  if p_user_name is null then
    select name into v_name from public.sc_users where id = p_user_id;
  else
    v_name := p_user_name;
  end if;

  insert into public.weekly_rankings(week_start, user_id, user_name, points_week)
  values (v_week, p_user_id, v_name, p_points)
  on conflict (week_start, user_id)
  do update set
    points_week = public.weekly_rankings.points_week + excluded.points_week,
    user_name   = coalesce(excluded.user_name, public.weekly_rankings.user_name),
    updated_at  = now();
end;
$$;

-- ── Trigger su user_events: ogni nuovo evento punta i settimanali ────────

create or replace function public.trigger_weekly_points_on_event()
returns trigger language plpgsql security definer as $$
begin
  if coalesce(NEW.points_delta, 0) > 0 then
    perform public.add_weekly_points(NEW.user_id, NEW.points_delta);
  end if;
  return NEW;
end;
$$;

drop trigger if exists weekly_points_on_event on public.user_events;
create trigger weekly_points_on_event
  after insert on public.user_events
  for each row
  execute function public.trigger_weekly_points_on_event();

-- ── Funzione: reset classifica settimanale (chiamata ogni lunedì) ────────
-- Prima finalizza la classifica precedente (aggiorna rank), poi segna week come chiusa.
-- NB: non cancella i dati, li mantiene come storico.

create or replace function public.finalize_weekly_rankings()
returns void language plpgsql security definer as $$
declare
  v_prev_week date := public.current_week_start() - interval '7 days';
begin
  -- Aggiorna i rank per la settimana appena conclusa
  with ranked as (
    select user_id,
           row_number() over (order by points_week desc) as rk
    from public.weekly_rankings
    where week_start = v_prev_week
  )
  update public.weekly_rankings wr
  set rank = ranked.rk
  from ranked
  where wr.user_id = ranked.user_id and wr.week_start = v_prev_week;
end;
$$;

-- ── Classifica settimanale corrente (view pubblica) ───────────────────────
create or replace view public.v_weekly_leaderboard as
select
  wr.user_id,
  wr.user_name,
  wr.points_week,
  row_number() over (order by wr.points_week desc) as rank,
  wr.week_start
from public.weekly_rankings wr
where wr.week_start = (select public.current_week_start())
order by wr.points_week desc
limit 50;

-- ── Cron job via pg_cron (se l'estensione è abilitata su Supabase) ────────
-- Esegue ogni lunedì alle 00:05 (Europa/Roma)
-- NOTA: pg_cron lavora in UTC. 00:05 CET = 23:05 UTC (ore inverno), 22:05 UTC (estate)
-- Per semplicità, usa UTC lunedì mattina 06:00 (copre entrambi i fusi)

-- Questo blocco va eseguito manualmente dalla Dashboard Supabase → SQL Editor
-- solo se l'estensione pg_cron è attiva sul tuo progetto:
/*
select cron.schedule(
  'finalize-weekly-rankings',
  '5 0 * * 1',    -- ogni lunedì alle 00:05 UTC
  $$select public.finalize_weekly_rankings();$$
);
*/
