# GAMBLY — Deploy real passo a passo

Este guia é o roteiro para colocar o GAMBLY online. Não coloque nenhuma chave secreta no GitHub.

## 0. O que você precisa

- Conta no GitHub
- Conta no Supabase
- Conta no Render
- Um domínio (opcional no primeiro deploy; o Render fornece um `onrender.com`)
- Conta no Resend para e-mail transacional
- Conta/chave do provedor de dados esportivos, se quiser jogos ao vivo reais

## 1. GitHub

1. Crie um repositório privado chamado `gambly`.
2. Extraia o ZIP.
3. Abra a pasta no VS Code.
4. No terminal:

```bash
npm install
git init
git add .
git commit -m "GAMBLY Sprint 22"
git branch -M main
git remote add origin SEU_REPOSITORIO_GITHUB
git push -u origin main
```

Antes do push, confirme que `.env` não está sendo enviado. O `.env.example` pode ser versionado.

## 2. Supabase

1. Crie um novo projeto.
2. Abra o **SQL Editor**.
3. Execute primeiro `supabase-schema.sql`.
4. Depois execute `supabase-production.sql`.
5. Confira as tabelas e índices.
6. Em Project Settings / API, copie a URL do projeto.
7. Copie a chave secreta de servidor somente para o Render. Ela possui acesso elevado e não pode ir para o navegador.

## 3. Render

1. Crie um Web Service conectado ao repositório GitHub.
2. Runtime: Node.
3. Build Command: `npm ci`.
4. Start Command: `npm start`.
5. Health Check: `/api/ready`.
6. Configure as variáveis abaixo no ambiente de produção:

```text
NODE_ENV=production
APP_URL=https://SEU-DOMINIO.com
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=GAMBLY <no-reply@SEU-DOMINIO.com>
API_FOOTBALL_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://SEU-DOMINIO.com/api/auth/google/callback
```

`PORT` não precisa ser definido manualmente no Render; o servidor usa a variável fornecida pela plataforma.

## 4. Primeiro deploy

Depois de salvar as variáveis, faça o deploy.

Teste:

```text
https://SEU-DOMINIO.com/api/health
https://SEU-DOMINIO.com/api/ready
```

Os dois devem responder sem erro; `/api/ready` precisa confirmar que o Supabase está acessível.

## 5. Domínio

No Render, adicione seu domínio em Custom Domains. Depois configure o DNS no registrador do domínio e aguarde a verificação. O Render fornece TLS/HTTPS para o domínio verificado.

Depois de o domínio funcionar, atualize:

```text
APP_URL
GOOGLE_REDIRECT_URI
robots.txt
sitemap.xml
EMAIL_FROM
```

## 6. E-mail

No Resend:

1. Crie a conta.
2. Verifique o domínio de envio.
3. Configure os registros DNS solicitados.
4. Crie a API key.
5. Coloque a chave apenas no Render.
6. Teste "Esqueci minha senha".

## 7. Google Login

No Google Cloud Console:

1. Crie/seleciona um projeto.
2. Configure a tela de consentimento OAuth.
3. Crie um OAuth Client para Web.
4. Adicione como redirect autorizado:

```text
https://SEU-DOMINIO.com/api/auth/google/callback
```

5. Coloque `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Render.

## 8. Teste de produção

Teste manualmente:

- cadastro
- login
- logout
- Google Login
- recuperação de senha
- edição de perfil
- avatar
- tema claro/escuro
- publicação
- curtida/descurtida
- comentário
- seguir/deixar de seguir
- busca
- feed paginado
- notificações
- mensagens
- SSE/realtime
- jogos ao vivo
- grupos Premium
- páginas de Termos, Privacidade e Jogo Responsável
- mobile Android/iPhone

## 9. Segurança antes de abrir ao público

- Nunca publique `SUPABASE_SERVICE_ROLE_KEY`.
- Nunca coloque `.env` no GitHub.
- Ative MFA nas contas de infraestrutura.
- Configure domínio e HTTPS.
- Revise RLS e políticas do Storage.
- Configure backup/recuperação do banco.
- Configure monitoramento e alertas.
- Faça revisão jurídica de Termos, Privacidade, LGPD, idade mínima, publicidade/afiliados e regras de jogo responsável.

## 10. Critério de lançamento

Não considerar o GAMBLY público até que login, banco persistente, e-mail, domínio, segurança, mobile, jogos e fluxos sociais tenham sido testados no ambiente de produção.
