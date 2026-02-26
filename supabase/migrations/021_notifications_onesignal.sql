-- Migration 021: Aggiunge onesignal_player_id e notification_preferences a sc_users

ALTER TABLE sc_users
  ADD COLUMN IF NOT EXISTS onesignal_player_id text,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb
    NOT NULL DEFAULT '{"mission_assigned":true,"mission_completed":true,"prize_won":true,"prize_expiring":true,"overtaken":true,"promo_active":true,"badge_unlocked":true}'::jsonb;
