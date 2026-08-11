-- GAMBLY Sprint 29.1 — mercados esportivos ampliados
-- Executar depois das migrations anteriores.

DO $$
BEGIN
  ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'double_chance';
  ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'first_half_winner';
  ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'corners_over_under';
  ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'cards_over_under';
  ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'shots_on_target_over_under';
  ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'total_shots_over_under';
  ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'offsides_over_under';
  ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'fouls_over_under';
  ALTER TYPE prediction_type ADD VALUE IF NOT EXISTS 'team_goals_over_under';
END $$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS half_time_home_score INTEGER,
  ADD COLUMN IF NOT EXISTS half_time_away_score INTEGER,
  ADD COLUMN IF NOT EXISTS stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_events_provider_name_status ON public.events(provider_name,status,start_time);
CREATE INDEX IF NOT EXISTS idx_events_stats ON public.events USING GIN(stats);

COMMENT ON COLUMN public.events.stats IS 'Snapshot normalizado das estatísticas usadas para liquidação: escanteios, cartões, chutes, impedimentos, faltas e posse.';
COMMENT ON COLUMN public.events.provider_events IS 'Eventos normalizados do feed esportivo, usados para auditoria e 1º tempo.';
COMMENT ON COLUMN public.events.half_time_home_score IS 'Placar no intervalo para mercados de primeiro tempo.';
COMMENT ON COLUMN public.events.half_time_away_score IS 'Placar no intervalo para mercados de primeiro tempo.';
