# GAMBLY — Sprint 23: Primeiro Deploy Real

## Objetivo
Colocar a primeira versão pública do GAMBLY no ar com Render + Supabase, mantendo as chaves secretas apenas no servidor.

## Ajustes desta versão
- Health check do Render alterado para `/api/health`, que é leve e não depende do banco.
- `/api/ready` permanece como verificação profunda de banco.
- Adicionado `preflight.js` para validar configuração de produção antes do deploy.
- Adicionado `.gitignore` para impedir `.env` e segredos de irem para o Git.
- Versão atualizada para `0.23.0`.
- Mantidos tema escuro/claro, identidade GAMBLY, feed, mensagens, notificações, seguidores, grupos e jogos.

## Ordem de implantação
1. Criar projeto no Supabase.
2. Executar `supabase-schema.sql`.
3. Executar `supabase-production.sql`.
4. Criar o bucket `avatars` e revisar as políticas.
5. Criar repositório privado no GitHub e subir somente os arquivos do projeto.
6. Criar Web Service no Render apontando para o repositório.
7. Configurar Build Command `npm ci` e Start Command `npm start`.
8. Configurar `APP_URL`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no Render.
9. Fazer o primeiro deploy e verificar `/api/health` e `/api/ready`.
10. Depois adicionar Google OAuth, Resend, Sportmonks e domínio próprio.

## Segurança
- Nunca colocar `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nunca subir `.env` para GitHub.
- Usar HTTPS em produção.
- Antes do lançamento público, revisar LGPD, idade mínima, termos, privacidade e jogo responsável.
