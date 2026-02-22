-- 014_companion_codes.sql
-- Sistema companion code: codici di gruppo validi 10 minuti, geo-localizzati.
-- companion_codes: codici generati dal creator dopo un check-in
-- companion_joins: chi si è unito tramite un codice

CREATE TABLE IF NOT EXISTS companion_codes (
  id           uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text             NOT NULL UNIQUE,
  venue_id     uuid             NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  creator_id   uuid             NOT NULL REFERENCES sc_users(id) ON DELETE CASCADE,
  creator_lat  double precision NOT NULL,
  creator_lng  double precision NOT NULL,
  expires_at   timestamptz      NOT NULL,
  created_at   timestamptz      NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companion_joins (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id   uuid        NOT NULL REFERENCES companion_codes(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES sc_users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_companion_codes_code    ON companion_codes(code);
CREATE INDEX IF NOT EXISTS idx_companion_codes_expires ON companion_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_companion_joins_user    ON companion_joins(user_id);

ALTER TABLE companion_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_joins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_companion_codes" ON companion_codes USING (true);
CREATE POLICY "service_role_companion_joins" ON companion_joins USING (true);
