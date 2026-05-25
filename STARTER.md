# Starter do Projeto BitWhat

Este arquivo e um guia rapido para iniciar, desenvolver, testar e empacotar o BitWhat.

## Visao geral

BitWhat e um app desktop local para Windows que encapsula o WhatsApp Web em Electron.

O app usa:

- Electron para a janela desktop, bandeja e sessao persistente.
- React + Vite para a tela interna de controles/configuracoes.
- TypeScript no main, preload e renderer.
- electron-builder para gerar o instalador Windows.

## Requisitos

- Node.js LTS 20 ou superior.
- Windows 10/11.
- npm instalado junto com o Node.

## Primeiro uso

Instale as dependencias:

```bash
npm install
```

Rode em desenvolvimento:

```bash
npm run dev
```

Gere o instalador Windows:

```bash
npm run build:win
```

O instalador sera criado em:

```text
dist/BitWhat-0.1.0-Setup.exe
```

## Scripts principais

```bash
npm run dev
```

Abre o app em modo desenvolvimento.

```bash
npm run typecheck
```

Valida os tipos TypeScript sem gerar build.

```bash
npm run build
```

Gera o build Electron/Vite em `out/`.

```bash
npm run build:win
```

Gera o build e empacota o instalador Windows em `dist/`.

```bash
npm run icons
```

Regenera os icones em `build/`.

## Estrutura importante

```text
src/
  main/
    main.ts
    ipc.ts
    services/
      window-manager.ts
      tray-manager.ts
      session-manager.ts
      settings-store.ts
      navigation-guard.ts
      whatsapp-panel-mode.ts
  preload/
    preload.ts
  renderer/
    index.html
    src/
      App.tsx
      main.tsx
      styles.css
  shared/
    api.ts
    ipc.ts
    types.ts
```

## Fluxo do app

1. O processo main cria a janela principal e o BrowserView do WhatsApp.
2. O WhatsApp Web carrega em sessao isolada `persist:bitwhat`.
3. O renderer React mostra a barra superior, status e configuracoes.
4. O preload expoe apenas a API segura `window.bitWhat`.
5. O icone da bandeja controla abrir, recarregar, limpar sessao e sair.
6. Ao fechar a janela no `X`, o app apenas oculta e continua na bandeja.

## Arquivos mais sensiveis

`src/main/services/window-manager.ts`

Controla janela, BrowserView, bounds, status e injecao visual do painel do WhatsApp.

`src/main/services/whatsapp-panel-mode.ts`

Controla o modo visual `Contatos`/`Chat` dentro do WhatsApp Web. Este arquivo depende do DOM do WhatsApp e pode precisar de ajuste caso o WhatsApp altere seus seletores.

`src/main/services/session-manager.ts`

Configura a sessao persistente isolada do WhatsApp e permisssoes basicas.

`src/main/services/navigation-guard.ts`

Bloqueia navegacoes indevidas e envia links externos para o navegador padrao.

## Regras de seguranca do projeto

- Nunca copiar cookies ou sessoes de Chrome, Edge, Firefox ou qualquer navegador externo.
- Nunca armazenar mensagens, prints, tokens, senhas ou conteudo das conversas.
- Nunca adicionar automacao de envio em massa, spam ou manipulacao nao autorizada.
- Manter `contextIsolation: true`.
- Manter `nodeIntegration: false`.
- Manter APIs Node fora do WhatsApp Web.
- Logs devem ser tecnicos, sem conteudo de mensagens.

## Teste manual rapido

1. Abra o app.
2. Faca login manualmente no WhatsApp Web pelo QR Code, se necessario.
3. Feche a janela pelo `X` e confirme que o app continua na bandeja.
4. Clique no icone da bandeja e confirme que a janela volta.
5. Alterne entre `Contatos` e `Chat`.
6. Em `Contatos`, confirme que aparece apenas a lista de conversas/contatos.
7. Em `Chat`, confirme que aparece apenas a conversa selecionada.
8. Use `Recarregar` e confirme que a sessao continua ativa.
9. Use `Limpar sessao/logout` e confirme que apenas a sessao do BitWhat foi removida.

## Observacao para testar builds novas

Antes de testar uma nova build instalada, feche o BitWhat antigo pelo menu da bandeja usando `Sair`.

Se o processo antigo continuar ativo, ele pode manter codigo antigo em memoria e parecer que a alteracao nova nao funcionou.
