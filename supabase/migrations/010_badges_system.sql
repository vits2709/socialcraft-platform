-- Tabella badge sbloccati per utente
-- Storico persistente con timestamp di sblocco
CREATE TABLE IF NOT EXISTS user_badge_unlocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES sc_users(id) ON DELETE CASCADE,
  badge_id    text        NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE user_badge_unlocks ENABLE ROW LEVEL SECURITY;

-- Service role bypassa RLS automaticamente.
-- Policy permissiva di fallback per accessi autenticati futuri.
CREATE POLICY "read_own_badge_unlocks"
  ON user_badge_unlocks FOR SELECT
  USING (true);

-- Indice per query frequenti (user_id)
CREATE INDEX IF NOT EXISTS idx_badge_unlocks_user ON user_badge_unlocks(user_id);
