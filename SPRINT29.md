# GAMBLY — Sprint 29

## Objetivo
Transformar o MVP em uma base de produção para **bilhetes/múltiplas + dados esportivos + liquidação automática**.

### Entregue
- Bet Slip Engine determinístico.
- Parser de texto para mercados: vencedor, empate, dupla chance, over/under, ambas marcam, placar exato, 1º tempo, escanteios, cartões, chutes no alvo, chutes totais, impedimentos, faltas e gols por equipe.
- Endpoint `POST /api/bet-slips/parse`.
- Integração de sincronização com API-Football/API-SPORTS (plano Free disponível; 100 requisições/dia), com arquitetura de provider substituível.
- Match engine por `providerEventId` ou por equipes + horário.
- Atualização automática de eventos.
- Liquidação automática de palpites pendentes após evento finalizado/cancelado.
- Notificação detalhada por seleção: bateu/não bateu, seleção e placar.
- Atualização do resultado do múltiplo.
- Auditoria da fonte e versão do resultado.
- Endpoint administrativo `POST /api/admin/sports/sync`.
- Endpoint administrativo `GET /api/admin/sports/status`.
- Migration `supabase-sprint29.sql`.

## O que NÃO é fingido
A Sprint 29 não faz scraping de Google, Flashscore ou SofaScore. Para produção, use uma fonte de dados esportivos licenciada. O adaptador incluído usa API-Football e exige `API_FOOTBALL_KEY`.

O parser de texto também não afirma que fez OCR. Uma futura camada de OCR pode enviar o texto extraído para `/api/bet-slips/parse`; até lá, a revisão do usuário é obrigatória.

## Fluxo
1. Usuário cria/publica bilhete.
2. Seleções são normalizadas.
3. Cada seleção é vinculada a um `eventId`.
4. Provedor envia estado/placar.
5. Evento vira `finished` ou `cancelled`.
6. Motor de liquidação avalia cada seleção.
7. Usuário recebe uma notificação por seleção.
8. O múltiplo é recalculado.
9. Histórico/estatísticas/ranking passam a refletir o resultado.

## Provedor
Variáveis:
```env
SPORTS_PROVIDER=api-football
API_FOOTBALL_KEY=
SPORTS_SYNC_DAYS=2
SPORTS_SYNC_TIMEOUT_MS=10000
```

O endpoint de sincronização deve ser chamado por um cron externo ou job do backend:
```http
POST /api/admin/sports/sync
x-admin-token: <GAMBLY_ADMIN_TOKEN>
```

## Vercel + Render: correção da regressão
O frontend Next.js e a API Node são serviços separados. O Vercel não deve tentar executar `api/server.js` como se fosse uma API Next.

No Vercel:
```env
API_ORIGIN=https://SEU-BACKEND.onrender.com
```

No Render (API):
```env
APP_URL=https://mdrbet.vercel.app
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GAMBLY_ADMIN_TOKEN=...
API_FOOTBALL_KEY=...
NODE_ENV=production
```

O `next.config.ts` agora **falha o build em produção se `API_ORIGIN` não estiver configurada**, evitando que o deploy pareça funcionar mas login/feed falhem por apontarem para `localhost`.

## QA antes do deploy
```bash
npm install
npm run typecheck
npm run test:settlement
npm run preflight
npm run build
```

Depois de publicar:
```bash
curl https://SEU-BACKEND.onrender.com/api/health
curl https://SEU-BACKEND.onrender.com/api/ready
```

A primeira verificação no frontend deve ser:
- Cadastro
- Login
- Logout
- Feed
- Criar palpite
- Histórico
- Ranking
- Notificação de resultado


## Sprint 29.1 — mercados ampliados

### Mercados suportados no MVP
- Vencedor / empate
- Dupla chance (1X, X2, 12)
- Vencedor do 1º tempo
- Gols totais (over/under)
- Ambas marcam
- Placar exato
- Escanteios totais (over/under)
- Cartões totais (amarelos + vermelhos) (over/under)
- Chutes no alvo (over/under)
- Chutes totais (over/under)
- Impedimentos (over/under)
- Faltas (over/under)
- Gols da equipe mandante/visitante (over/under)

### Fonte
API-Football/API-SPORTS é o provider padrão desta versão. O plano Free anunciado pelo fornecedor é de 100 requisições/dia e inclui fixtures, events e statistics. As estatísticas podem ter `null` em competições que não as coletam; nesse caso o GAMBLY mantém o palpite `pending` em vez de inventar um resultado.
