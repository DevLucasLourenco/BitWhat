# BitWhat

Cliente desktop compacto para WhatsApp Web com Electron, TypeScript, React, Vite e ícone na bandeja do Windows.

O app encapsula `https://web.whatsapp.com` em uma sessão persistente própria (`partition: "persist:bitwhat"`). O login é feito manualmente dentro do aplicativo, por QR Code ou autenticação normal do WhatsApp Web.

## Segurança e privacidade

- Não copia, lê, importa ou reutiliza cookies/sessões do Chrome, Edge, Firefox ou qualquer outro navegador.
- Não coleta credenciais, tokens ou cookies sensíveis.
- Não grava conversas, mensagens, prints ou conteúdo do WhatsApp em banco local.
- Não implementa robôs, automação de envio em massa, spam ou manipulação não autorizada de mensagens.
- Links externos do WhatsApp são enviados ao navegador padrão do sistema.
- A tela interna usa `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` e CSP.
- O WhatsApp Web roda isolado em `partition: "persist:bitwhat"`, sem acesso às APIs Node do app.

## Requisitos

- Node.js LTS 20 ou superior.
- Windows 10/11 para o alvo inicial de empacotamento.

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

O app abre uma janela compacta e também cria o ícone na bandeja do sistema. O botão `X` oculta a janela, mantendo o processo ativo na bandeja.

## Gerar instalador Windows

```bash
npm run build:win
```

O instalador NSIS será gerado em `dist/`.

## Limpar sessão/logout

Use uma das opções:

- Menu de contexto do ícone da bandeja: `Limpar sessão/logout`.
- Tela interna de configurações: `Limpar sessão`.

Essa ação limpa somente a sessão persistente isolada do BitWhat. Navegadores pessoais não são acessados nem alterados.

## Compatibilidade com WhatsApp Web

O WhatsApp Web não usa o Chrome instalado no Windows quando roda dentro deste aplicativo. Ele enxerga o Chromium embutido no Electron. Para evitar a tela de "atualize o Chrome", a sessão isolada do WhatsApp anuncia uma identidade de Chrome desktop/Windows apenas para `https://web.whatsapp.com`.

## Menu da bandeja

- `Abrir WhatsApp`
- `Recarregar`
- `Limpar sessão/logout`
- `Sair`

## Configurações do MVP

- Navegação automática: clicar em um contato abre o chat; no chat, o botão de sidebar volta aos contatos.
- Formato do chat: `Padrão` ou `Mini`.
- O formato `Mini` redimensiona a janela para a visualização reduzida.
- Sempre no topo.
- Iniciar minimizada na bandeja.
- Iniciar com Windows.
- Tema claro, escuro ou sistema para a tela interna.

## Arquitetura

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

## Limitações conhecidas

- O layout interno do WhatsApp Web pode mudar; a detecção de estado é propositalmente mínima e defensiva.
- O painel alternável depende de seletores visuais do WhatsApp Web; se o WhatsApp alterar o DOM, pode ser necessário ajustar a injeção visual.
- Chamadas, mídia e notificações dependem das permissões do WhatsApp Web e do Windows.
- O app não é uma integração oficial de atendimento, CRM, multiusuário ou automação.
- O build Windows local usa `win.signAndEditExecutable: false` para evitar falhas de symlink do `winCodeSign` em contas sem Developer Mode/admin. Para distribuição corporativa assinada, reative essa opção e configure um certificado.
- Para atendimento oficial, integrações empresariais e automações autorizadas, use a WhatsApp Business Platform / Cloud API da Meta.

## Boas práticas mantidas

- Sessão persistente isolada do Electron: `persist:bitwhat`.
- Nenhum acesso a perfis de navegadores externos.
- Nenhum armazenamento de conteúdo de mensagens.
- IPC exposto por `contextBridge` com API mínima.
- Links externos tratados fora da janela do WhatsApp.
- Logs limitados a eventos técnicos.
