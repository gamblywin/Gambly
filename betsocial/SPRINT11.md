# BetSocial v0.11 — Sprint 11

## Objetivo

Consolidar a base para a próxima conexão com Supabase e corrigir a identidade da tela de autenticação.

## Alterações

- Branding da autenticação corrigido para **BET SOCIAL**.
- Título do navegador atualizado para BetSocial.
- Rodapé da autenticação atualizado para Sprint 11.
- Corrigido o botão duplicado de recuperação de senha.
- Chave de sessão do frontend atualizada para `betsocial_v11_token`.
- Health check atualizado para `0.11.0`.
- Mantida compatibilidade com PostgreSQL/Supabase via `DATABASE_URL`.
- Mantido fallback JSON para desenvolvimento local.
- Mantidos login, cadastro, OAuth Google preparado, recuperação de senha, feed, seguidores, mensagens, notificações e SSE.

## Rodar localmente

```bash
npm install
npm start
```

Abra `http://localhost:3000`.

## Verificar banco

```bash
npm run db:check
```

Sem `DATABASE_URL`, o resultado esperado é modo `json`.

## Preparar Supabase

1. Criar um projeto no Supabase.
2. Obter a string de conexão PostgreSQL.
3. Copiar `.env.example` para `.env`.
4. Preencher `DATABASE_URL`.
5. Rodar `npm run db:check`.
6. Rodar `npm start`.

O backend aplica o schema de `docs/supabase-schema.sql` e, quando o banco está vazio, importa a base local JSON.

## Próxima etapa — Sprint 12

Concluir a integração de produção: Supabase Storage para avatares/imagens, RLS refinado por recurso, recuperação de senha com domínio/e-mail configurados, busca social, perfil público completo e feed com paginação.
