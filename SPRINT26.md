# SPRINT 26 — GAMBLY 2.2 — Production Foundation

## Objetivo
Deixar o GAMBLY pronto para o primeiro ambiente público com Supabase como fonte de dados de produção, Storage preparado e Realtime habilitado.

## Entregas
- [x] Produção falha de forma segura sem Supabase configurado
- [x] Cliente Supabase browser seguro (`NEXT_PUBLIC_*` apenas)
- [x] Hook de Realtime
- [x] Índices adicionais
- [x] Storage `avatars`
- [x] Storage `post-media`
- [x] Estrutura para vincular perfil a Supabase Auth
- [x] Publicação Realtime preparada
- [x] `npm run db:check`
- [x] `npm run predeploy`
- [x] Typecheck/preflight

## Segurança
`SUPABASE_SERVICE_ROLE_KEY` é exclusivamente server-side. Nunca use essa chave em `NEXT_PUBLIC_*`, no GitHub ou em código do browser.

## Banco
Execute `supabase-sprint26.sql` depois dos schemas anteriores no SQL Editor do Supabase.

## Importante sobre autenticação
A camada atual ainda usa a API de sessão do GAMBLY. Esta sprint prepara o Supabase Auth e Realtime sem quebrar a aplicação existente. A migração final da autenticação para Supabase Auth deve ser feita em uma sprint específica, com migração de contas e testes de sessão, antes de remover a autenticação legada.

## Próximo
Sprint 27 — Deploy de staging:
GitHub → Supabase → Render → variáveis → health check → testes E2E → domínio.
