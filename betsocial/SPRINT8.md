# BetSocial v0.8 — Sprint 8

## Entregas
- Camada de persistência com PostgreSQL/Supabase e fallback automático para JSON local.
- Migração inicial automática do `data/db.json` para PostgreSQL quando `DATABASE_URL` estiver configurada.
- Sessões com cookie HttpOnly/SameSite e compatibilidade Bearer.
- OAuth Google real via `/api/auth/google` + callback.
- Recuperação de senha com token de uso único e expiração; envio via Resend quando configurado.
- Feed personalizado com seguidores.
- Seguir/deixar de seguir usuários.
- Contagem de seguidores/seguindo atualizada.
- SSE mantido para notificações, mensagens e eventos do feed.
- Health check informa o modo do banco.
- Estrutura pronta para mover o estado JSON para tabelas normalizadas e RLS do Supabase na Sprint 9.

## Rodar localmente
```bash
npm install
npm start
```
Sem `DATABASE_URL`, o projeto continua funcionando com `data/db.json`.

## PostgreSQL/Supabase
1. Crie um projeto no Supabase.
2. Copie a connection string para `DATABASE_URL`.
3. Rode `npm start`. A primeira inicialização cria a tabela de estado e migra o JSON.

## Google OAuth
Configure no Google Cloud um OAuth Client do tipo Web e use como redirect:
`http://localhost:3000/api/auth/google/callback`
Depois preencha `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI`.

## Recuperação de senha
Em desenvolvimento, sem `RESEND_API_KEY`, a API devolve `devResetUrl` para teste. Em produção, configure o Resend.
