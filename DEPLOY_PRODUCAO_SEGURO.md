# GAMBLY — Deploy de produção sem regredir a Sprint

## Arquitetura oficial

- **Vercel:** somente o frontend Next.js.
- **Render:** somente `api/server.js` (backend).
- **Supabase:** banco de produção.
- **API-Football:** fonte esportiva configurada pelo backend.

Não publique o mesmo projeto como dois frontends. O Vercel aponta para o backend pelo `API_ORIGIN`.

## 1. Supabase

Execute as migrations na ordem:

1. `supabase-gambly-mvp.sql`
2. `SPRINT24_COMUNIDADES_MIGRATION.sql` (se sua base usa comunidades)
3. `supabase-sprint26.sql`
4. `supabase-sprint28-settlement.sql`
5. `supabase-sprint29.sql`
6. `supabase-sprint29-markets.sql`
7. `supabase-sprint30-player-markets.sql`

Não execute uma migration antiga por cima de uma base nova sem conferir o estado atual.

## 2. Render

Crie o serviço usando o `render.yaml` deste ZIP ou configure manualmente:

- Root: raiz do projeto
- Build: `npm install`
- Start: `node api/server.js`
- Health: `/api/health`

Variáveis obrigatórias:

```text
NODE_ENV=production
APP_URL=https://SEU-FRONTEND.vercel.app
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GAMBLY_ADMIN_TOKEN=gere-um-token-forte
SPORTS_PROVIDER=api-football
API_FOOTBALL_KEY=...
SPORTS_SYNC_DAYS=2
SPORTS_SYNC_TIMEOUT_MS=10000
```

## 3. Vercel

Configure apenas:

```text
API_ORIGIN=https://SEU-BACKEND.onrender.com
```

O `next.config.ts` falha o build de produção se `API_ORIGIN` não existir, evitando o problema de deploy que fazia login/cadastro apontarem para localhost.

## 4. Antes de publicar

```bash
npm install
npm run predeploy
npm run build
```

Depois valide:

```text
GET https://SEU-BACKEND.onrender.com/api/health
```

E no frontend:

- cadastro
- login
- logout
- feed
- criar palpite
- múltiplo
- perfil
- histórico
- estatísticas
- ranking
- notificações

## 5. Dados esportivos

A chave `API_FOOTBALL_KEY` fica somente no Render. Nunca coloque essa chave em `NEXT_PUBLIC_*` ou no frontend.

A sincronização só busca estatísticas de jogadores quando existem palpites de jogador pendentes para um evento finalizado. Isso economiza chamadas no plano gratuito.

## 6. Rollback

Antes de cada deploy:

```bash
git add .
git commit -m "GAMBLY Sprint X"
git push
```

Se algo quebrar, faça rollback para o commit anterior no provedor. Não misture alterações manuais no Vercel com alterações diferentes no Git.

## 7. Regra para próximas Sprints

Toda Sprint deve preservar:

- API_ORIGIN obrigatório em produção;
- backend separado do frontend;
- migrations incrementais;
- testes de liquidação;
- `npm run predeploy` passando;
- nenhuma chave secreta no frontend.
