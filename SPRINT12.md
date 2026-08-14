# BetSocial v0.12 — UX de perfil e identidade

## Implementado
- Edição real de perfil com nome, @usuário, bio e foto.
- Upload de avatar com prévia, remoção e compressão automática para WebP 512px.
- Avatar persistido no backend (`users.avatar`) via PATCH `/api/profile`.
- Avatares sincronizados no cabeçalho, card lateral, compositor, prévia e modal de perfil.
- Removido o estado visual falso de “Visitante” para usuários deslogados.
- Card de perfil e ações de publicação ficam ocultos para visitantes.
- Removidos “Explorar” e “Stories” da navegação lateral; Stories continua como bloco próprio no feed.
- Perfil corrigido para não deixar a foto escondida pela área do cabeçalho do perfil.

## Limite
O avatar é armazenado como data URL no banco atual. Para produção em escala, a próxima evolução recomendada é migrar imagens para Supabase Storage e guardar somente a URL no usuário.
