# Deploy — Sprint 28

## 1. Banco
No Supabase, execute primeiro `supabase-gambly-mvp.sql` e depois `supabase-sprint28-settlement.sql`.

## 2. Variáveis do backend
Configure no serviço que roda `api/server.js`:

```env
NODE_ENV=production
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
APP_URL=https://SEU-DOMINIO
GAMBLY_ADMIN_TOKEN=TOKEN_LONGO_E_SECRETO
```

`SUPABASE_SERVICE_ROLE_KEY` e `GAMBLY_ADMIN_TOKEN` são **somente servidor**.

## 3. Fechar um evento
O backoffice/servidor deve chamar:

```http
POST /api/admin/events/ev_001/result
x-admin-token: TOKEN_LONGO_E_SECRETO
Content-Type: application/json

{"status":"finished","homeScore":2,"awayScore":1}
```

O endpoint:
- grava o placar;
- muda o evento para `finished`;
- liquida todos os palpites pendentes compatíveis;
- cria notificações;
- registra `settledAt` e `settlementReason`.

Para jogo cancelado:

```json
{"status":"cancelled"}
```

## 4. Regra importante
Não envie o token administrativo ao navegador. Não crie um botão público que contenha o token. A operação deve ficar em painel administrativo protegido ou em job/serviço de confiança.
