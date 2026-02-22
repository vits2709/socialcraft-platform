-- ══════════════════════════════════════════════════════════════
-- PRIORITÀ 7: Sistema Premi Settimanali
-- ══════════════════════════════════════════════════════════════

-- ── Tabella premi settimanali ─────────────────────────────────────────────────
-- Una riga per settimana, configurata dall'admin prima dell'inizio.
-- Il vincitore e il codice riscatto vengono popolati a fine settimana.

create table if not exists public.weekly_prizes (
  id                        uuid        primary key default gen_random_uuid(),
  week_start                date        not null unique,  -- lunedì della settimana (Europe/Rome)
  spot_id                   uuid        references public.venues(id) on delete set null,
  prize_description         text        not null,
  prize_image               text,                        -- URL immagine premio (opzionale)
  winner_user_id            text,                        -- sc_uid del vincitore (text, come weekly_rankings)
  winner_name               text,                        -- snapshot nome vincitore
  winner_assigned_at        timestamptz,
  redemption_code           text        unique,          -- es. CQ-2607-AB3K
  redemption_code_expires_at timestamptz,
  redeemed                  boolean     not null default false,
  redeemed_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_weekly_prizes_week_start
  on public.weekly_prizes(week_start desc);

create index if not exists idx_weekly_prizes_winner
  on public.weekly_prizes(winner_user_id);

-- RLS
alter table public.weekly_prizes enable row level security;
create policy "weekly_prizes_select_public"  on public.weekly_prizes for select using (true);
create policy "weekly_prizes_write_service"  on public.weekly_prizes for all using (true);

-- ── Tabella notifiche utente ───────────────────────────────────────────────────
-- Notifiche per gli esploratori (sc_uid). Non usa Supabase Auth.

create table if not exists public.user_notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null,                       -- sc_uid
  type       text        not null default 'generic',     -- 'prize_won' | 'generic'
  title      text        not null,
  body       text        not null default '',
  data       jsonb       not null default '{}',
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user
  on public.user_notifications(user_id, read, created_at desc);

-- RLS (le API usano sempre service_role / admin client)
alter table public.user_notifications enable row level security;
create policy "user_notifications_service_all" on public.user_notifications for all using (true);

-- ── Funzione: assegna vincitore settimana appena conclusa ────────────────────
-- Da chiamare domenica sera o lunedì mattina, dopo finalize_weekly_rankings().
-- Cerca il premio configurato per la settimana precedente,
-- prende il 1° classificato e genera un codice riscatto univoco.

create or replace function public.assign_weekly_winner()
returns jsonb language plpgsql security definer as $$
declare
  v_prev_week  date;
  v_prize      record;
  v_winner     record;
  v_code       text;
  v_attempts   int := 0;
  v_year_code  text;
  v_week_num   text;
  v_chars      text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_rnd        text;
  i            int;
begin
  -- Settimana precedente (lunedì scorso in Europe/Rome)
  v_prev_week := (date_trunc('week', now() at time zone 'Europe/Rome') - interval '7 days')::date;

  -- Controlla se il premio è configurato per questa settimana
  select * into v_prize
  from public.weekly_prizes
  where week_start = v_prev_week;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_prize_configured', 'week_start', v_prev_week::text);
  end if;

  -- Se il vincitore è già stato assegnato, non fare nulla
  if v_prize.winner_user_id is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'winner_already_assigned',
      'winner_user_id', v_prize.winner_user_id,
      'winner_name', v_prize.winner_name
    );
  end if;

  -- Prendi il 1° classificato della settimana (punti decrescenti, poi id crescente per tiebreak)
  select wr.user_id, wr.user_name
  into v_winner
  from public.weekly_rankings wr
  where wr.week_start = v_prev_week
    and wr.points_week > 0
  order by wr.points_week desc, wr.created_at asc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_eligible_winner');
  end if;

  -- Genera codice riscatto univoco: CQ-[YY][IW]-[4CHARS senza ambiguità]
  v_year_code := to_char(v_prev_week, 'YY');
  v_week_num  := lpad(to_char(v_prev_week, 'IW'), 2, '0');

  loop
    v_rnd := '';
    for i in 1..4 loop
      v_rnd := v_rnd || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    end loop;
    v_code := 'CQ-' || v_year_code || v_week_num || '-' || v_rnd;

    exit when not exists (select 1 from public.weekly_prizes where redemption_code = v_code);

    v_attempts := v_attempts + 1;
    if v_attempts > 100 then
      raise exception 'Impossibile generare codice univoco dopo 100 tentativi';
    end if;
  end loop;

  -- Aggiorna il premio con il vincitore e il codice
  update public.weekly_prizes set
    winner_user_id             = v_winner.user_id,
    winner_name                = v_winner.user_name,
    winner_assigned_at         = now(),
    redemption_code            = v_code,
    redemption_code_expires_at = (v_prev_week + interval '14 days')::timestamptz,
    updated_at                 = now()
  where week_start = v_prev_week;

  -- Crea notifica per il vincitore
  insert into public.user_notifications (user_id, type, title, body, data)
  values (
    v_winner.user_id,
    'prize_won',
    '🏆 Hai vinto il premio settimanale!',
    'Congratulazioni! Hai vinto: ' || v_prize.prize_description ||
      '. Usa il codice ' || v_code || ' entro 14 giorni per riscattarlo.',
    jsonb_build_object(
      'prize_id',          v_prize.id,
      'redemption_code',   v_code,
      'prize_description', v_prize.prize_description,
      'expires_at',        (v_prev_week + interval '14 days')::text
    )
  );

  return jsonb_build_object(
    'ok',              true,
    'winner_user_id',  v_winner.user_id,
    'winner_name',     v_winner.user_name,
    'redemption_code', v_code,
    'week_start',      v_prev_week::text
  );
end;
$$;
