-- ══════════════════════════════════════════════════════════════
-- Fix: cast text → uuid nella SELECT di add_weekly_points
-- sc_users.id è uuid, p_user_id arriva come text → operatore
-- "uuid = text" non esiste. Usiamo p_user_id::uuid per il lookup.
-- ══════════════════════════════════════════════════════════════

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
  if p_user_name is null then
    begin
      select name into v_name
      from public.sc_users
      where id = p_user_id::uuid;
    exception when invalid_text_representation then
      v_name := null;
    end;
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
