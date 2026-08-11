# GAMBLY 2.9 — Sprint 29

## Escopo
Esta versão fecha o MVP definido pela equipe: cadastro, login, perfil, feed, palpites, interação social, follows, histórico, estatísticas e ranking.

## Rodar localmente

```bash
npm install
npm start
```

O `npm start` faz o build automaticamente e inicia o frontend em http://localhost:3000 e a API em http://localhost:4000.

Para desenvolvimento com hot reload, use `npm run dev`.

Em produção, o frontend Next.js deve usar `API_ORIGIN` apontando para o backend do Render.

Verificações:

```bash
npm run doctor
npm run typecheck
npm run preflight
npm run mvp:check
```

## Banco de dados

O arquivo principal desta sprint é:

`supabase-gambly-mvp.sql`

Ele incorpora o modelo recebido da equipe e adiciona:
- eventos esportivos;
- palpites;
- histórico;
- views de estatísticas;
- ranking;
- índices;
- Storage.

**Não execute o SQL original recebido sem adaptação.** Ele usa `password_hash` diretamente na tabela de usuários. A versão GAMBLY usa a camada de sessão existente e prepara a migração para Supabase Auth.

## Deploy
Ainda não é o deploy final. Primeiro valide localmente e depois faremos:
1. GitHub;
2. Supabase;
3. execução do `supabase-gambly-mvp.sql`;
4. Storage;
5. Render;
6. variáveis de ambiente;
7. testes públicos.


## Sprint 28 — Liquidação
A versão 2.8 adiciona o motor de liquidação de palpites, endpoint administrativo protegido por `GAMBLY_ADMIN_TOKEN`, auditoria de resultado e testes dos mercados do MVP. Antes de produção, execute `supabase-sprint28-settlement.sql` no PostgreSQL/Supabase.

Comandos principais:
- `npm install`
- `npm run test:settlement`
- `npm run typecheck`
- `npm run preflight`
- `npm run build`

## Sprint 28+ — palpites múltiplos

A Sprint 28 original foi preservada. Esta extensão acrescenta agrupamento de 2–10 seleções, mantendo as odds individuais já existentes, além de auditoria da origem do resultado. Execute `supabase-sprint28-plus.sql` depois da migração da Sprint 28.


## Sprint 29
Consulte `SPRINT29.md` e `DIAGNOSTICO_DEPLOY_MDRBET.md`. A API deve ser publicada separadamente do frontend Next.js. Configure `API_ORIGIN` no Vercel e `APP_URL` no backend.


## Sprint 29.1 — mercados ampliados
O GAMBLY agora modela mercados de futebol além de gols/BTTS: dupla chance, vencedor do 1º tempo, escanteios, cartões, chutes no alvo, chutes totais, impedimentos, faltas e gols por equipe. O resultado é calculado a partir do snapshot de estatísticas salvo no evento.

### Provedor gratuito inicial
Use `SPORTS_PROVIDER=api-football` e `API_FOOTBALL_KEY`. A API-Football informa plano Free com 100 requisições/dia e acesso a fixtures, events e statistics; o sistema persiste os dados no banco para evitar chamadas por página.

Migration adicional: `supabase-sprint29-markets.sql`.


## Sprint 30

Mercados de jogador, sincronização sob demanda de estatísticas de atletas e deploy seguro. Consulte `SPRINT30.md` e `DEPLOY_PRODUCAO_SEGURO.md`.
