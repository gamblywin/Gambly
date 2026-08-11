# GAMBLY Sprint 30 — Sports Data + Bet Slip Intelligence + Deploy Safety

## Objetivo
Evoluir o motor para mercados de jogador e deixar a publicação em produção previsível, sem perder funcionalidades de Sprints anteriores.

## Mercados cobertos

### Jogo/equipe
- vencedor
- empate
- dupla chance
- vencedor 1º tempo
- gols over/under
- ambas marcam
- placar exato
- escanteios over/under
- cartões over/under
- chutes no alvo over/under
- chutes totais over/under
- impedimentos over/under
- faltas over/under
- gols da equipe over/under

### Jogador
- jogador marca a qualquer momento
- gols do jogador over/under
- assistências over/under
- chutes no alvo over/under
- chutes totais over/under
- jogador recebe cartão
- cartões do jogador over/under
- cartão vermelho do jogador
- passes over/under
- desarmes over/under
- faltas cometidas over/under

## Dados

O provider padrão é API-Football/API-SPORTS. A chave fica apenas no backend.

A sincronização de jogadores é sob demanda: somente eventos finalizados que possuem palpites de jogador pendentes tentam buscar `fixtures/players`. Isso evita gastar chamadas desnecessárias no plano gratuito.

Se a fonte não fornecer uma estatística, o palpite permanece `pending` em vez de ser marcado incorretamente como perdido.

## Deploy seguro

- Vercel = frontend.
- Render = backend.
- Supabase = banco.
- `API_ORIGIN` é obrigatório em produção.
- `API_FOOTBALL_KEY` nunca vai para o frontend.
- `render.yaml` deste ZIP contém somente o serviço API.
- `DEPLOY_PRODUCAO_SEGURO.md` é a fonte única do procedimento.

## QA

Validados localmente sem dependências externas:

- sintaxe do backend/provider/engines;
- 11 testes de mercados de jogador;
- testes anteriores de liquidação e agregação de múltiplos;
- configuração de produção revisada para não apontar para localhost.

O build completo (`npm install` + `npm run build`) depende da instalação das dependências no ambiente de deploy.
