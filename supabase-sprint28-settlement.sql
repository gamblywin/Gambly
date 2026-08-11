-- GAMBLY Sprint 28 — Liquidação de palpites + auditoria
-- Executar DEPOIS do supabase-gambly-mvp.sql

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settlement_reason VARCHAR(80);

-- Compatibilidade com dados já liquidados antes desta migração.
UPDATE predictions
SET settled_at = COALESCE(settled_at, created_at),
    settlement_reason = COALESCE(settlement_reason, CASE result
      WHEN 'won' THEN 'legacy_won'
      WHEN 'lost' THEN 'legacy_lost'
      WHEN 'void' THEN 'legacy_void'
      ELSE NULL END)
WHERE result IN ('won','lost','void') AND settled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_result_event
  ON predictions(event_id, result);

CREATE INDEX IF NOT EXISTS idx_predictions_settled_at
  ON predictions(settled_at DESC);

-- Regras de segurança: apenas palpites pendentes podem receber liquidação.
ALTER TABLE predictions
  DROP CONSTRAINT IF EXISTS predictions_settlement_consistency;

ALTER TABLE predictions
  ADD CONSTRAINT predictions_settlement_consistency
  CHECK (
    (result = 'pending' AND settled_at IS NULL)
    OR
    (result IN ('won','lost','void') AND settled_at IS NOT NULL)
  );

-- Índice útil para o ranking/histórico.
CREATE INDEX IF NOT EXISTS idx_predictions_user_result_created
  ON predictions(user_id, result, created_at DESC);

COMMENT ON COLUMN predictions.settled_at IS 'Momento em que o resultado do palpite foi definido.';
COMMENT ON COLUMN predictions.settlement_reason IS 'Motivo técnico da liquidação (selection_hit, selection_missed, event_cancelled).';
