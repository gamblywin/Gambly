# SPRINT 27 — GAMBLY MVP COMPLETO

Esta sprint fecha o escopo mostrado no requisito recebido pela equipe.

## Requisitos
- [x] Cadastro
- [x] Login
- [x] Perfil do usuário
- [x] Feed social
- [x] Criar palpite
- [x] Curtir/comentar (estrutura existente)
- [x] Seguir usuários
- [x] Visualizar palpites de outros
- [x] Sistema de ranking
- [x] Histórico de palpites
- [x] Estatísticas do usuário

## Modelo de dados
A estrutura recebida da equipe foi incorporada e ampliada para:
- sports
- leagues
- teams
- events
- predictions
- posts
- comments
- likes via liked_by/contadores na camada atual
- follows
- notifications
- messages
- views de estatísticas e ranking

## Observação de autenticação
O SQL recebido originalmente armazenava `password_hash` em `users`.
Não copiamos essa decisão cegamente. A chave de serviço fica somente no servidor e a migração final para Supabase Auth será feita em uma sprint específica, antes de produção definitiva.

## Critério de aceite do MVP
Um usuário deve conseguir:
1. criar conta;
2. entrar;
3. ver seu perfil;
4. ver o feed;
5. criar um palpite para um evento;
6. visualizar seu histórico;
7. visualizar estatísticas;
8. aparecer no ranking após ter palpites liquidados;
9. interagir socialmente com publicações;
10. seguir outros usuários.

## Próxima sprint
Sprint 28: testes integrados + liquidação de eventos/resultados + comentários/likes auditados + Supabase Auth/RLS final + preparação de deploy.
