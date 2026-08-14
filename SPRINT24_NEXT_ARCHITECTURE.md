# Sprint 24 — GAMBLY 2.0 Architecture

## Objetivo

Reduzir a dependência de HTML/JS estático e criar uma base sustentável para uma rede social de apostas real.

## O que foi preservado

- Identidade GAMBLY e logo atual.
- Tema escuro e tema claro sutil.
- Feed, curtidas, publicação e navegação principal.
- Autenticação existente.
- API existente, comunidades, grupos premium, mensagens, notificações, seguidores e jogos.
- Scripts SQL e preparação para Supabase.

## O que mudou

### Frontend

Next.js App Router + React + TypeScript.

Componentes:
- Header
- Sidebar
- Feed
- PostCard
- RightRail
- AuthModal
- ComposerModal
- ThemeToggle

### Backend

A API atual foi isolada em `api/`. Isso evita uma reescrita arriscada de dezenas de endpoints durante a migração visual.

O Next faz proxy de `/api/*` para o serviço de API por meio de `API_ORIGIN`.

### Deploy

Render preparado para dois Web Services:

1. `gambly-web`: Next.js.
2. `gambly-api`: Node.js API.

## Próxima migração

Sprint 25 deve migrar autenticação, feed, perfil, comunidades e mensagens para integrações Supabase nativas no frontend/backend, removendo progressivamente a dependência do JSON local.
