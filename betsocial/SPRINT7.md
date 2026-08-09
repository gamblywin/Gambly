# BetSocial v0.7 — Sprint 7

## Entregas
- SSE (Server-Sent Events) para notificações, mensagens e atualizações de posts em tempo real.
- Token efêmero de 60 segundos para abrir o canal SSE sem expor o bearer token diretamente.
- Rate limit básico para login e cadastro.
- Sessões com expiração e limpeza automática.
- Comentários agora são persistidos como registros (`db.comments`) e possuem GET por publicação.
- Curtidas/notificações e mensagens emitem eventos em tempo real.
- Feed de jogos ao vivo sincronizado pela API `/api/sports/live` a cada 15 segundos.
- Adaptador para provedor esportivo externo via `SPORTS_API_URL` + `SPORTS_API_KEY`.
- Health check v0.7 com status de realtime.
- `.env.example` preparado para a migração PostgreSQL/Supabase.

## Rodar
```bash
npm start
```

## Próxima fase — Sprint 8
Migração efetiva para PostgreSQL/Supabase, RLS, recuperação de senha por e-mail, OAuth Google real e provider esportivo homologado.
