# GAMBLY — Como iniciar

## Requisitos
- Node.js 18 ou superior
- npm (vem com o Node.js)

## Instalação
Na pasta que contém este `package.json`:

```bash
npm install
```

O projeto atualmente não depende de pacotes npm externos, então o comando pode responder `up to date`. Isso é normal.

## Rodar

```bash
npm start
```

Abra `http://localhost:3000`.

## Diagnóstico

```bash
npm run doctor
npm run preflight
npm run smoke
```

## Importante
Não execute `npm start` dentro de uma pasta pai. O terminal deve estar exatamente na pasta onde estão `package.json` e `server.js`.

Para produção, configure as variáveis do `.env.example` no painel do Render. Nunca publique `.env` ou chaves secretas no GitHub.

## Sprint 23.2 — acesso local
O servidor continua escutando em `0.0.0.0` quando necessário para deploy, mas o endereço indicado para abrir no computador é:

`http://localhost:3000/`

Não abra `http://0.0.0.0:3000/` no navegador. `0.0.0.0` é um endereço de bind/escuta, não o endereço local preferencial para navegação.

Para iniciar:

```bash
npm install
npm start
```

Depois abra `http://localhost:3000/`.

O tema claro continua disponível pelo botão de tema. A correção deixa os cards, posts, composer, modais e formulários consistentes no claro, enquanto a tela de login/cadastro mantém o visual escuro premium do GAMBLY.
