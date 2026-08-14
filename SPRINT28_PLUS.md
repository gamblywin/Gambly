# GAMBLY — Sprint 28+

Esta extensão é incremental: a Sprint 28 original permanece intacta.

## Acrescentado
- Agrupamento de 2 a 10 seleções em um **palpite múltiplo**.
- Cada seleção continua sendo uma `prediction` independente, preservando `odds`.
- `slipId` liga cada seleção ao agrupador.
- Resultado geral do múltiplo: `pending`, `won`, `lost` ou `void`.
- Auditoria da origem do resultado no evento: `resultSource`, `resultSourceVersion`, `resultReceivedAt`.
- Detalhamento por seleção continua disponível para histórico e notificações.

## Regra do resultado geral
- qualquer seleção perdida → `lost`;
- alguma pendente e nenhuma perdida → `pending`;
- todas anuladas → `void`;
- todas as demais liquidadas sem perda → `won`.

## Migração
Execute `supabase-sprint28-plus.sql` depois de `supabase-sprint28-settlement.sql`.

## API
- `POST /api/prediction-slips` — cria múltiplo de 2–10 seleções.
- `GET /api/prediction-slips/mine` — lista os múltiplos do usuário.
- `GET /api/prediction-slips/:id` — detalha um múltiplo próprio.

Não há cálculo de odd combinada nem qualquer movimentação financeira nesta extensão. As odds individuais já existentes permanecem preservadas.
