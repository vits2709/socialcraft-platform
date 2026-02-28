-- Migration 025: Public user profiles
-- Adds username, bio, social links, avatar, and visibility to sc_users

ALTER TABLE sc_users
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text CHECK (char_length(bio) <= 100),
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS twitter_x text,
  ADD COLUMN IF NOT EXISTS avatar_emoji text DEFAULT '🧭',
  ADD COLUMN IF NOT EXISTS profile_color text DEFAULT '#2D1B69',
  ADD COLUMN IF NOT EXISTS showcase_badges jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Funzione slugify
CREATE OR REPLACE FUNCTION slugify_for_username(t text)
RETURNS text AS $$
  SELECT REGEXP_REPLACE(
    REGEXP_REPLACE(LOWER(TRIM(COALESCE(t, ''))), '[^a-z0-9]+', '-', 'g'),
    '^-+|-+$', '', 'g'
  );
$$ LANGUAGE sql IMMUTABLE;

-- Funzione assegna username univoco
CREATE OR REPLACE FUNCTION assign_unique_username(p_id uuid, p_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix int := 1;
BEGIN
  base_slug := slugify_for_username(p_name);
  IF base_slug = '' THEN base_slug := 'esploratore'; END IF;
  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM sc_users WHERE username = candidate AND id != p_id) LOOP
    candidate := base_slug || '-' || suffix;
    suffix := suffix + 1;
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

-- Backfill utenti esistenti
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, name FROM sc_users WHERE username IS NULL ORDER BY created_at ASC LOOP
    UPDATE sc_users SET username = assign_unique_username(r.id, r.name) WHERE id = r.id;
  END LOOP;
END;
$$;

-- Unique constraint (dopo backfill)
ALTER TABLE sc_users ADD CONSTRAINT sc_users_username_unique UNIQUE (username);

-- Trigger per nuovi utenti
CREATE OR REPLACE FUNCTION sc_users_set_username()
RETURNS trigger AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := assign_unique_username(NEW.id, NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sc_users_set_username ON sc_users;
CREATE TRIGGER trg_sc_users_set_username
  BEFORE INSERT ON sc_users
  FOR EACH ROW EXECUTE FUNCTION sc_users_set_username();
