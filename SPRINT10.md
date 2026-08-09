# BetSocial v0.10 — Sprint 10

## Objetivo
Deixar o projeto pronto para a conexão com Supabase/PostgreSQL sem exigir banco local instalado no computador.

## O que mudou
- carregamento automático do arquivo `.env` com `dotenv`;
- diagnóstico de banco com `npm run db:check`;
- endpoint `/api/health` identifica a versão e o modo do banco;
- configuração `.env.example` revisada para Supabase;
- conexão PostgreSQL continua sendo feita pelo backend, preservando as credenciais fora do frontend;
- schema SQL permanece em `docs/supabase-schema.sql`;
- fallback JSON continua disponível quando `DATABASE_URL` não estiver configurada.

## Rodar sem Supabase
1. Copie `.env.example` para `.env`.
2. Deixe `DATABASE_URL` vazia.
3. `npm install`
4. `npm start`

## Conectar ao Supabase
1. Crie um projeto no Supabase.
2. Abra **Project Settings → Database**.
3. Copie a connection string PostgreSQL.
4. Cole em `DATABASE_URL` no `.env`.
5. Mantenha `DATABASE_SSL=true`.
6. Rode `npm run db:check`.
7. Se retornar `mode: postgres`, rode `npm start`.

O backend cria as tabelas do schema na inicialização e, se `users` estiver vazia, importa o `data/db.json` uma única vez.

## Importante sobre segurança
A `DATABASE_URL` e a `SUPABASE_SERVICE_ROLE_KEY`, quando usadas, ficam somente no backend. Nunca coloque essas credenciais em JavaScript do navegador ou no Git.

## Supabase Auth
Nesta Sprint, a autenticação principal do BetSocial continua no backend. O Supabase é usado como PostgreSQL. A adoção do Supabase Auth pode ser feita em uma Sprint posterior sem quebrar o modelo atual.
