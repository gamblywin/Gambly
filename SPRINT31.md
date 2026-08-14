# SPRINT 31 — GAMBLY Live Center + Social Posting

## Objetivo
Transformar o fluxo esportivo em uma experiência integrada:
partida ao vivo → detalhes → estatísticas/jogadores → análise/palpite → feed.

## Fases entregues
- Central `/live` responsiva com pesquisa, país, campeonato, contador, agrupamento e atualização automática da interface.
- Contrato único `/api/sports/live` com `games`, `data`, `total` e `liveCount`.
- Detalhes `/live/[id]` com resumo, placar, estatísticas, eventos e jogadores.
- Endpoints `/api/events/:id` e `/api/events/:id/players`.
- Composer com busca de jogos e jogadores e vínculo explícito da publicação ao evento.
- Publicação sem reload: o novo post entra imediatamente no topo do Feed.
- PostCard mostra o evento real vinculado, placar e acesso à partida ao vivo.
- Curtida inicia com o estado real do usuário.
- Right rail deixou de usar jogos fictícios e consome a API.
- Mercados de jogador liberados nas rotas de palpite e validação de jogador.
- Render permanece separado: Vercel/Next.js para frontend e Render/Node para API.

## Deploy do backend
Render:
- Build Command: `npm install`
- Start Command: `node api/server.js`
- Health Check: `/api/health`

## Observação sobre atualização dos dados
A interface consulta a base a cada 30 segundos. A sincronização do provedor continua sendo responsabilidade do endpoint administrativo `/api/admin/sports/sync` ou de um job/cron externo configurado no ambiente. Isso evita chamar a API esportiva a cada atualização da tela e consumir a cota do provedor.

## Próximos refinamentos
- Storage de imagens no Supabase Storage em vez de Base64.
- Moderação e menu de ações do post.
- Comentários em tempo real.
- Sincronização agendada do provedor.
- Logos oficiais de times e ícones de eventos quando disponíveis.
