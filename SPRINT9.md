# BetSocial v0.9 — Sprint 9

## Entregas
- Banco PostgreSQL/Supabase normalizado em tabelas reais, com migração inicial do `data/db.json`.
- RLS habilitado nas tabelas; o frontend não acessa o banco diretamente.
- Feed personalizado e grafo social persistente.
- Endpoint de rede e perfil real.
- Chat por conversa com leitura de mensagens e SSE mantido.
- API health v0.9.0.
- Fallback JSON continua disponível para desenvolvimento sem PostgreSQL.

## Banco
Preencha `DATABASE_URL` no `.env` com a connection string do Supabase/PostgreSQL. O servidor cria as tabelas e migra o JSON inicial automaticamente quando o banco está vazio.

## Execução
```bash
npm install
npm start
```
