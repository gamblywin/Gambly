# BetSocial v0.18 — Sprint 18

## Objetivo
Consolidar a evolução dos Sprints 11–17 e fechar lacunas de produto antes da integração de produção.

## Entregas
- Busca social real por usuários e publicações via `/api/search`.
- Feed com paginação (`limit`, `offset`, `hasMore`, `nextOffset`).
- Curtida idempotente: o mesmo usuário pode curtir/descurtir sem inflar a contagem.
- Navegação móvel inferior com Feed, Ao vivo, Publicar, Alertas e Perfil.
- Busca adaptada para telas pequenas.
- Versão/health check atualizados para 0.18.0.
- Mantidos autenticação, sessões, SSE, perfil, seguidores, mensagens, notificações, grupos e provider esportivo.
- Nenhuma credencial é colocada no frontend.

## Planejamento
### Já concluído
Autenticação, feed social, seguidores, chat, notificações, SSE, PostgreSQL/Supabase preparado, perfil/avatares e responsividade.

### Próxima etapa — Sprint 19
- Supabase Storage para avatares/imagens (URL em vez de data URL).
- RLS refinado por recurso.
- Paginação visual com "Carregar mais" / infinite scroll.
- Busca com página de resultados dedicada.
- Testes automatizados de API e smoke test.
- Preparação para deploy (variáveis, CSP e HTTPS).

## Execução
```bash
npm install
npm start
```
Abra `http://localhost:3000`.
