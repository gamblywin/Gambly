# GAMBLY 2.0 — Guia da migração

Esta versão é uma migração arquitetural, não uma troca destrutiva.

## Antes

HTML + vários arquivos JS/CSS globais + Node servindo tudo.

## Agora

- Next.js App Router
- React
- TypeScript
- componentes reutilizáveis
- API Node isolada em `api/`
- proxy `/api/*` no Next
- Supabase mantido como destino de produção

## Por que a API antiga ficou isolada?

O backend já contém autenticação, feed, comunidades, grupos premium, notificações, mensagens, seguidores, realtime e jogos. Reescrever tudo de uma vez aumentaria o risco de quebrar funcionalidades.

A nova arquitetura permite migrar uma área por vez, mantendo o produto funcionando.

## Próxima fase

1. Migrar Auth para um módulo tipado.
2. Migrar Feed e Perfil para Server Components/Server Actions quando apropriado.
3. Migrar comunidades e grupos.
4. Migrar mensagens/realtime.
5. Remover gradualmente o JSON local.
6. Produção somente com Supabase.
