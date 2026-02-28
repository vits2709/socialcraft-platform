-- Aggiunge colonna prize_type a weekly_prizes per supportare premi settimanali e mensili
ALTER TABLE weekly_prizes
  ADD COLUMN IF NOT EXISTS prize_type text NOT NULL DEFAULT 'weekly'
  CHECK (prize_type IN ('weekly', 'monthly'));

COMMENT ON COLUMN weekly_prizes.prize_type IS 'Tipo di premio: weekly (7gg) o monthly (28gg)';
