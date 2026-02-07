-- SocialCraft: venue rating with QR token monouso (120s) + admin/venue login
-- Esegui nel Supabase SQL Editor.

-- BASE TABLES
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  owner_user_id uuid unique,
  created_at timestamptz not null default now()
);

create table if not exists public.venue_ratings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- LEADERBOARD VIEW
create or replace view public.venue_leaderboard as
select
  v.id,
  v.name,
  v.city,
  coalesce(avg(r.rating)::numeric, 0) as avg_rating,
  count(r.id)::int as ratings_count
from public.venues v
left join public.venue_ratings r on r.venue_id = v.id
group by v.id, v.name, v.city;

-- TOKEN TABLE
create table if not exists public.venue_vote_tokens (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_vote_tokens_lookup
on public.venue_vote_tokens (venue_id, token);

-- FUNCTIONS (security definer)
create or replace function public.submit_vote_with_token(
  p_venue_id uuid,
  p_token text,
  p_rating int,
  p_note text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating';
  end if;

  update public.venue_vote_tokens
  set used_at = v_now
  where venue_id = p_venue_id
    and token = p_token
    and used_at is null
    and expires_at > v_now;

  if not found then
    raise exception 'token_invalid_or_expired';
  end if;

  insert into public.venue_ratings (venue_id, rating, note)
  values (p_venue_id, p_rating, left(nullif(p_note,''), 280));
end;
$$;

revoke all on function public.submit_vote_with_token(uuid, text, int, text) from public;
grant execute on function public.submit_vote_with_token(uuid, text, int, text) to anon, authenticated;

create or replace function public.create_vote_token(
  p_venue_id uuid,
  p_ttl_seconds int default 120
)
returns text
language plpgsql
security definer
as $$
declare
  v_token text;
  v_is_admin boolean;
  v_owner uuid;
  v_ttl int;
begin
  select exists(select 1 from public.admins a where a.user_id = auth.uid()) into v_is_admin;
  select owner_user_id into v_owner from public.venues where id = p_venue_id;

  if not v_is_admin and v_owner is distinct from auth.uid() then
    raise exception 'not_allowed';
  end if;

  v_ttl := greatest(30, least(p_ttl_seconds, 300));
  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.venue_vote_tokens (venue_id, token, expires_at)
  values (p_venue_id, v_token, now() + make_interval(secs => v_ttl));

  return v_token;
end;
$$;

revoke all on function public.create_vote_token(uuid, int) from public;
grant execute on function public.create_vote_token(uuid, int) to authenticated;

-- RLS
alter table public.venues enable row level security;
alter table public.venue_ratings enable row level security;
alter table public.admins enable row level security;
alter table public.venue_vote_tokens enable row level security;

-- venues: readable by all (leaderboard)
drop policy if exists "venues_read_all" on public.venues;
create policy "venues_read_all"
on public.venues for select
to anon, authenticated
using (true);

-- venues: only admin can write
drop policy if exists "venues_admin_all" on public.venues;
create policy "venues_admin_all"
on public.venues for all
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ratings: readable by all (optional)
drop policy if exists "ratings_read_all" on public.venue_ratings;
create policy "ratings_read_all"
on public.venue_ratings for select
to anon, authenticated
using (true);

-- IMPORTANT: no public insert policy on venue_ratings.
-- Insert happens ONLY via submit_vote_with_token() function.

-- admins: only admins can read admins table
drop policy if exists "admins_read" on public.admins;
create policy "admins_read"
on public.admins for select
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- vote_tokens: deny direct select/insert to clients (kept server-side)
-- We don't add policies for select/insert: only functions access as security definer.

-- Seed demo venues (no owner linked)
insert into public.venues (name, city) values
  ('Mood', 'Vasto'),
  ('CioccoBar', 'San Salvo'),
  ('Blue Room', 'Pescara')
on conflict do nothing;
