-- GAMBLY Sprint 30 — mercados de jogadores e dados de liquidação
-- Execute depois das migrations anteriores.

ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS provider_event_id VARCHAR(80);
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS stats JSONB;
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS provider_name VARCHAR(80);
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS result_source VARCHAR(80);
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS result_source_version VARCHAR(80);
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS result_received_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS player_stats JSONB;
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS player_stats_received_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS player_stats_source VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_events_provider_event_id ON events(provider_event_id);

-- Se predictions usar PostgreSQL com enum criado anteriormente, acrescente os novos valores.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prediction_type') THEN
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_anytime_score'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_goals'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_assists'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_shots_on_target'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_shots'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_cards'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_red_cards'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_to_be_booked'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_passes'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_tackles'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'player_fouls'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- Campos opcionais para guardar a identificação do atleta quando o palpite vier de OCR/parser.
ALTER TABLE IF EXISTS predictions ADD COLUMN IF NOT EXISTS player_name VARCHAR(120);
ALTER TABLE IF EXISTS predictions ADD COLUMN IF NOT EXISTS player_id VARCHAR(40);
CREATE INDEX IF NOT EXISTS idx_predictions_player_id ON predictions(player_id);
