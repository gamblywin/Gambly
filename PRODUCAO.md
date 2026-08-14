# Checklist de produção — GAMBLY

## Infraestrutura
- [ ] Projeto Supabase criado
- [ ] `supabase-schema.sql` executado
- [ ] `supabase-production.sql` executado
- [ ] Render configurado
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `APP_URL` HTTPS configurado
- [ ] domínio customizado configurado

## Autenticação
- [ ] cadastro
- [ ] login
- [ ] logout
- [ ] sessão persistente
- [ ] recuperação de senha
- [ ] Google OAuth (se habilitado)

## Produto
- [ ] feed
- [ ] publicar
- [ ] curtir/descurtir
- [ ] comentários
- [ ] seguir/deixar de seguir
- [ ] perfil
- [ ] mensagens
- [ ] notificações
- [ ] SSE/realtime
- [ ] jogos ao vivo
- [ ] grupos/premium

## Segurança
- [ ] service role nunca exposta ao frontend
- [ ] HTTPS
- [ ] Secure cookie
- [ ] rate limiting
- [ ] CORS restrito por `APP_URL`
- [ ] headers de segurança
- [ ] backups do banco
- [ ] monitoramento de erros

## Jurídico/compliance antes do público
- [ ] Termos de Uso
- [ ] Política de Privacidade/LGPD
- [ ] idade mínima/18+
- [ ] regras para conteúdo de apostas
- [ ] publicidade/afiliados identificados
- [ ] responsible gambling
