# GAMBLY — Sprint 28+ UI / Interações

Esta atualização é incremental sobre a Sprint 28 e não remove o motor de liquidação existente.

## Correções
- Logo do cabeçalho sem duplicação do símbolo.
- Sidebar com rolagem própria quando o conteúdo ultrapassar a altura da tela.
- Notificações e mensagens não aparecem para visitantes deslogados.
- Perfil não é exibido para visitantes deslogados.
- Visitante recebe `Criar conta` ao lado de `Entrar`.
- Usuário logado recebe menu de conta com Meu perfil, Editar perfil e Sair.
- Botão de perfil continua acessível pela navegação lateral e pelo menu da conta.

## Composer
- Análise, Jogo, Imagem e Palpite agora são ações reais.
- Modal de publicação recebeu abas, hierarquia visual, prévia de imagem e estados de erro.
- Imagem pode ser selecionada, pré-visualizada, removida e publicada.
- Publicações de jogo guardam `eventId`.
- Palpites simples e múltiplos preservam odds e estrutura da Sprint 28+.

## Perfil
- Nova tela `/profile` com dados reais do usuário.
- Editor de nome, usuário, bio e foto.
- Foto aceita JPG/PNG/WEBP até 2,5 MB no cliente.

## Banco
A migration `supabase-sprint28-plus.sql` foi ampliada para guardar dados multimídia e vínculo de publicação com jogo/palpite:
- `event_id`
- `prediction_id`
- `slip_id`
- `image`

Em produção, a imagem deverá futuramente migrar de data URL para Supabase Storage; esta versão mantém data URL para facilitar o QA local.
