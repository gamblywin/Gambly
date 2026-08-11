# Diagnóstico do deploy — mdrbet.vercel.app

A versão enviada para este ZIP contém frontend Next.js e backend Node separados.

## Por que o login pode falhar no Vercel
`lib/api.ts` chama `/api/...`. O `next.config.ts` faz rewrite para `API_ORIGIN`.

Se `API_ORIGIN` não existir no ambiente de produção, a configuração antiga usava:
`http://localhost:4000`

No Vercel isso aponta para a própria infraestrutura da função/build e não para o backend GAMBLY. Resultado: a tela aparece, mas login/cadastro/ações que dependem da API falham.

## Correção
1. Publique o backend `api/server.js` no Render.
2. Copie a URL pública do backend.
3. No projeto Vercel, abra Settings → Environment Variables.
4. Crie:
   `API_ORIGIN=https://sua-api.onrender.com`
5. Faça redeploy.
6. No Render configure:
   `APP_URL=https://mdrbet.vercel.app`
7. Configure Supabase e `GAMBLY_ADMIN_TOKEN`.
8. Teste `/api/health` e `/api/ready` no domínio do backend.

O frontend agora interrompe o build de produção se `API_ORIGIN` estiver ausente, em vez de gerar um deploy silenciosamente quebrado.

## Sobre a aparência de "Sprint antiga"
O domínio público precisa apontar para o commit/projeto Vercel correto. O ZIP enviado contém as telas novas e o modal de autenticação real. Se o domínio continuar exibindo conteúdo de outro commit, verifique o projeto/branch de produção no Vercel e o commit efetivamente publicado.

A URL pública consultada mostra a UI GAMBLY atual, mas o funcionamento de autenticação depende do backend.
