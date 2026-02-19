-- ══════════════════════════════════════════════════════════════
-- Fix: cast esplicito uuid → text nel trigger weekly points
-- Il trigger passava NEW.user_id (uuid) a add_weekly_points(text,…)
-- senza cast → PostgreSQL non trovava la firma corretta.
-- ══════════════════════════════════════════════════════════════

create or replace function public.trigger_weekly_points_on_event()
returns trigger language plpgsql security definer as $$
begin
  if coalesce(NEW.points_delta, 0) > 0 then
    perform public.add_weekly_points(NEW.user_id::text, NEW.points_delta);
  end if;
  return NEW;
end;
$$;
