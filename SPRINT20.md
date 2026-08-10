# BetSocial v0.20 — Launch Readiness

## Objetivo
Transformar o Sprint 19 em uma base mais segura e consistente para o primeiro deploy real.

## Entregue
- cookies de sessão com `Secure` em produção/HTTPS;
- headers de segurança adicionais;
- encerramento gracioso do servidor em SIGTERM/SIGINT;
- Render configurado com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (em vez de `DATABASE_URL`);
- SQL complementar para índices e Supabase Storage de avatars;
- políticas defensivas do Storage;
- versão atualizada para 0.20.0.

## Antes do deploy
1. Execute `supabase-schema.sql` no SQL Editor do Supabase.
2. Execute `supabase-production.sql`.
3. Crie variáveis no Render usando os valores reais.
4. Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend.
5. Configure `APP_URL` com HTTPS.
6. Configure `GOOGLE_REDIRECT_URI` exatamente com o domínio público.
7. Configure `RESEND_API_KEY` e `EMAIL_FROM` se recuperação de senha estiver habilitada.
8. Configure `SPORTMONKS_API_TOKEN` se os jogos reais forem usados.

## Smoke test local
```bash
npm ci
npm start
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

## Critério de entrada para produção
- `/api/ready` HTTP 200 com `database: supabase`;
- login/cadastro funcionando;
- criação de post e persistência após reinício;
- follow/like/comment persistentes;
- mensagens e notificações funcionando;
- HTTPS ativo;
- secrets somente no ambiente do servidor.
