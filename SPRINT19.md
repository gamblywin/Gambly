# Sprint 19 — Produção

- versão 0.19.0
- bind em `0.0.0.0` para cloud
- endpoint `/api/ready` para health checks
- headers de segurança básicos
- CORS restrito quando `APP_URL` está configurado
- PostgreSQL/Supabase via `pg`
- `npm ci` reproduzível
- configuração Render documentada
- smoke test local
- caminho de produção separado do fallback JSON

## Critério de saída

O próximo passo não é adicionar mais telas: é executar um deploy real, conectar Supabase, testar autenticação, feed, follow, curtida, comentários, mensagens, notificações, recuperação de senha e jogos ao vivo em ambiente HTTPS.
