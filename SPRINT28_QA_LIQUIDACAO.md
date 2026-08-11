# GAMBLY — Sprint 28: QA + Liquidação de Palpites

## Objetivo
Fechar a primeira versão realmente funcional do MVP: um evento pode ser encerrado com placar oficial e os palpites pendentes são automaticamente classificados como `won`, `lost` ou `void`.

## Entregas
- Motor central de liquidação em `lib/settlement.js`.
- Endpoint administrativo `POST /api/admin/events/:id/result`.
- Consulta administrativa `GET /api/admin/predictions/pending`.
- Notificação automática de resultado para o autor do palpite.
- Auditoria por `settledAt` e `settlementReason`.
- Migração PostgreSQL em `supabase-sprint28-settlement.sql`.
- Testes automatizados dos mercados do MVP.
- Ranking/estatísticas passam a considerar `won/lost` como resultados liquidados; `void` não entra na taxa de acerto.

## Mercados suportados
### winner
Seleções aceitas: `home`, `casa`, `1`, nome do mandante, `away`, `fora`, `2`, nome do visitante, `draw`, `empate`, `x`.

### over_under
Formato: `over 2.5` ou `under 2.5`.

### both_teams_score
`sim`/`yes` ou `não`/`no`.

### exact_score
Formato: `2-1`, `2x1` ou `2:1`.

## Fechamento administrativo
Configure:

```env
GAMBLY_ADMIN_TOKEN=um-token-secreto-forte
```

Depois envie:

```http
POST /api/admin/events/ev_001/result
x-admin-token: um-token-secreto-forte
Content-Type: application/json

{"status":"finished","homeScore":2,"awayScore":1}
```

Para cancelamento:

```json
{"status":"cancelled"}
```

**Não exponha `GAMBLY_ADMIN_TOKEN` no frontend.**

## Critério de aceite
1. Criar um palpite pendente.
2. Encerrar o evento com placar.
3. Palpite vira `won` ou `lost` conforme o mercado.
4. Evento cancelado transforma palpites pendentes em `void`.
5. Usuário recebe notificação.
6. Histórico mostra o novo resultado.
7. Estatísticas e ranking refletem a liquidação.
8. `npm run test:settlement` passa.
9. `npm run typecheck` passa.

## Próxima etapa
Após a validação desta Sprint, a próxima etapa é **Sprint 29 — produção/deploy**: Supabase, variáveis de ambiente, domínio, build e publicação.
