-- Aggiunge colonne di scheduling alle promozioni esistenti.
-- Retrocompatibile: i valori di default mantengono le promo esistenti attive 24/7.

ALTER TABLE venue_promos
  ADD COLUMN IF NOT EXISTS bonus_type   text           NOT NULL DEFAULT 'points'
      CHECK (bonus_type IN ('points', 'multiplier')),
  ADD COLUMN IF NOT EXISTS bonus_value  numeric(6,2)   NOT NULL DEFAULT 0
      CHECK (bonus_value >= 0),
  ADD COLUMN IF NOT EXISTS days_of_week integer[]       NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  ADD COLUMN IF NOT EXISTS time_start   time           NOT NULL DEFAULT '00:00:00',
  ADD COLUMN IF NOT EXISTS time_end     time           NOT NULL DEFAULT '23:59:59',
  ADD COLUMN IF NOT EXISTS date_start   date,
  ADD COLUMN IF NOT EXISTS date_end     date;

-- Commento esplicativo sui valori
COMMENT ON COLUMN venue_promos.bonus_type IS 'points = punti aggiuntivi; multiplier = moltiplicatore punti base';
COMMENT ON COLUMN venue_promos.bonus_value IS 'Per type=points: punti extra. Per type=multiplier: fattore (es. 2 = x2). Max 5.';
COMMENT ON COLUMN venue_promos.days_of_week IS '0=Dom 1=Lun 2=Mar 3=Mer 4=Gio 5=Ven 6=Sab (formato JS getDay())';
COMMENT ON COLUMN venue_promos.time_start IS 'Ora di inizio promo (fuso orario Europe/Rome)';
COMMENT ON COLUMN venue_promos.time_end IS 'Ora di fine promo (fuso orario Europe/Rome)';
COMMENT ON COLUMN venue_promos.date_start IS 'Data di inizio validità (null = nessun limite)';
COMMENT ON COLUMN venue_promos.date_end IS 'Data di fine validità (null = nessun limite)';
