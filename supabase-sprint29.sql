-- GAMBLY Sprint 29 — Bet Slip Engine + Sports Data
-- Execute after supabase-sprint28-settlement.sql and supabase-sprint28-plus.sql.

ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS provider_event_id TEXT;
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS provider_name VARCHAR(80);
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS provider_last_sync_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS prediction_slips ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'manual';
ALTER TABLE IF EXISTS prediction_slips ADD COLUMN IF NOT EXISTS source_text TEXT;
ALTER TABLE IF EXISTS prediction_slips ADD COLUMN IF NOT EXISTS parser_version VARCHAR(30);
ALTER TABLE IF EXISTS prediction_slips ADD COLUMN IF NOT EXISTS parser_confidence NUMERIC(5,4);

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_provider_event
  ON events(provider_name, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_provider_status
  ON events(provider_name, status, start_time);

COMMENT ON COLUMN events.provider_event_id IS 'ID do evento no provedor esportivo licenciado.';
COMMENT ON COLUMN prediction_slips.source IS 'manual, text_parser ou future_ocr.';
COMMENT ON COLUMN prediction_slips.parser_confidence IS 'Confiança do parser; nunca substitui revisão do usuário.';
