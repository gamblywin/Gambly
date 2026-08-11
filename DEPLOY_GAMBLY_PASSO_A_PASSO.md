# Deploy do GAMBLY — passo a passo

## 1. Supabase
- Acesse o Dashboard do Supabase e crie um projeto novo.
- Abra SQL Editor.
- Execute primeiro `supabase-schema.sql`.
- Execute depois `supabase-production.sql`.
- Em Storage, confirme o bucket `avatars`.
- Copie a Project URL.
- Copie a chave de servidor (service role) somente para o Render.

## 2. GitHub
- Crie um repositório privado chamado `gambly`.
- Extraia este ZIP.
- Entre na pasta que contém `package.json`.
- Não envie `.env`.
- Faça commit e push para o GitHub.

## 3. Render
- Abra o Render Dashboard.
- New > Web Service.
- Conecte o GitHub e selecione o repositório.
- Runtime: Node.
- Build Command: `npm ci`.
- Start Command: `npm start`.
- Health Check Path: `/api/health`.
- Crie o serviço.

## 4. Variáveis do Render
Configure em Environment:

- `NODE_ENV=production`
- `APP_URL=https://SEU-ENDERECO.onrender.com`
- `SUPABASE_URL=https://SEU-PROJETO.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=...`

As demais podem ser adicionadas depois:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `API_FOOTBALL_KEY`

## 5. Primeiro teste
Após o deploy, abra:

`https://SEU-ENDERECO.onrender.com/api/health`

Deve retornar JSON com `ok: true`.

Depois:

`https://SEU-ENDERECO.onrender.com/api/ready`

Em produção, este endpoint deve indicar `database: supabase` e `ok: true`.

## 6. Teste funcional
- Abrir a home.
- Criar usuário.
- Fazer login.
- Publicar.
- Curtir/descurtir.
- Comentar.
- Seguir outro usuário.
- Enviar mensagem.
- Ver notificação.
- Alterar tema.
- Recarregar a página e confirmar persistência.

## 7. Só depois
- Google OAuth.
- E-mail de recuperação.
- API-Football.
- Domínio próprio.
- DNS/HTTPS.
- Analytics e monitoramento.
