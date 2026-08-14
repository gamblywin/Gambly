# GAMBLY — versão final: login + Render

## O que foi corrigido

- `npm start` agora faz o `next build` automaticamente e sobe **frontend + API** localmente.
- O frontend continua usando `/api/*`, com rewrite para `http://localhost:4000` no uso local.
- O login `/api/auth/login` e cadastro `/api/auth/register` continuam no backend, com sessão por cookie.
- O `render.yaml` não fixa `PORT=4000`; o Render fornece a porta do serviço.
- O backend continua separado do frontend em produção: **Render = API** e **Vercel = Next.js**.
- O build no Vercel exige `API_ORIGIN`, evitando login apontando para localhost em produção.

## Rodar no telefone

Na pasta do projeto:

```bash
npm install
npm start
```

Aguarde aparecer:

- `Ready` do Next.js em `http://localhost:3000`
- `GAMBLY v0.29 rodando ...` na API em `http://localhost:4000`

Depois abra `http://localhost:3000`.

## Render

Use o `render.yaml` deste pacote. O serviço é a API:

- Build: `npm install`
- Start: `node api/server.js`
- Health: `/api/health`

Variáveis obrigatórias:

```text
NODE_ENV=production
APP_URL=https://SEU-FRONTEND.vercel.app
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GAMBLY_ADMIN_TOKEN=...
SPORTS_PROVIDER=api-football
API_FOOTBALL_KEY=...
SPORTS_SYNC_DAYS=2
SPORTS_SYNC_TIMEOUT_MS=10000
```

Não defina `PORT` manualmente no Render.

## Vercel

No projeto do frontend, defina:

```text
API_ORIGIN=https://SEU-BACKEND.onrender.com
```

Sem essa variável, o build de produção no Vercel é interrompido de propósito.

## Teste do backend

Depois do deploy:

```text
https://SEU-BACKEND.onrender.com/api/health
```

Deve retornar JSON com `ok: true`.
