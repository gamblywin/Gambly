# GAMBLY — Sprint 22

## Produção, segurança e deploy

### Entregue
- Nome e identidade GAMBLY consolidados.
- Tema claro/escuro preservado.
- Render Blueprint atualizado para serviço `gambly`.
- Cookies de sessão renomeados para `gambly_session`, mantendo leitura do cookie legado.
- Origem pública usa `APP_URL` e fallback para `RENDER_EXTERNAL_URL`.
- Cache de assets estáticos.
- CSP inicial compatível com a aplicação atual.
- Rate limiting para login, cadastro, criação de posts, comentários, curtidas, mensagens, follows e edição de perfil.
- Termos, Privacidade e Jogo Responsável adicionados como páginas separadas.
- `robots.txt` e `sitemap.xml` preparados para domínio real.
- Guia `DEPLOY_GAMBLY.md` com o passo a passo de GitHub → Supabase → Render → domínio → e-mail → Google OAuth → testes.

### Próxima etapa
Sprint 23: execução assistida do deploy real, migração/validação do banco, Storage de avatar, e-mail transacional, OAuth Google, domínio e bateria de testes end-to-end.

### Observação
As páginas legais são modelos iniciais e precisam de revisão jurídica antes do lançamento público.
