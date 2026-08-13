# BitWhat

Cliente desktop compacto para WhatsApp Web com Electron, TypeScript, React, Vite e ícone na bandeja do Windows.

O app encapsula `https://web.whatsapp.com` em uma sessão persistente própria (`partition: "persist:bitwhat"`). O login é feito manualmente dentro do aplicativo, por QR Code ou autenticação normal do WhatsApp Web.

## Sobre a aplicação

O BitWhat é um cliente desktop leve para usar o WhatsApp Web em uma janela
compacta, sem precisar manter uma aba do navegador aberta. A aplicação foi
pensada para quem deseja deixar o WhatsApp disponível durante o trabalho, com
acesso rápido pela bandeja do Windows e controles básicos de janela.

O aplicativo não substitui o WhatsApp Web nem possui um servidor próprio. Ele
usa o Chromium embutido no Electron para abrir o site oficial do WhatsApp e
mantém a autenticação em uma sessão local exclusiva do BitWhat.

## Principais recursos

- Janela compacta dedicada ao WhatsApp Web.
- Ícone na bandeja do Windows para abrir, recarregar, limpar a sessão ou sair.
- Sessão persistente: o login permanece salvo entre as execuções, até que o
  usuário escolha limpar a sessão.
- Visualização de contatos ou de uma conversa específica.
- Modo de chat padrão ou mini, com redimensionamento automático da janela.
- Opção de manter a janela sempre no topo.
- Inicialização minimizada na bandeja ou junto com o Windows.
- Tema claro, escuro ou baseado no sistema operacional.
- Indicador de estado da conexão no aplicativo e no ícone da bandeja.

## Como usar

1. Abra o BitWhat pelo atalho criado no Windows.
2. Na primeira execução, faça login no WhatsApp Web usando o QR Code ou o
   método de autenticação apresentado pelo próprio WhatsApp.
3. Use o WhatsApp normalmente dentro da janela do aplicativo.
4. Feche a janela pelo botão `X` para ocultá-la na bandeja. Para encerrar o
   processo, escolha `Sair` no menu do ícone da bandeja.

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

## Criar o executável Windows

Com o Node.js LTS 20 ou superior instalado, execute na raiz do projeto:

```bash
npm install
npm run build:win
```

O comando compila o aplicativo e gera o instalador NSIS em `dist/`, normalmente
com o nome `BitWhat-<versão>-Setup.exe`. Esse é o arquivo que deve ser enviado
ou executado para instalar o BitWhat no Windows.

Para gerar apenas o aplicativo executável, sem instalador, use:

```bash
npm run build
npx electron-builder --win dir
```

Nesse caso, o executável fica em `dist/win-unpacked/BitWhat.exe`. A pasta
`dist/win-unpacked/` deve ser mantida completa para que o executável funcione.

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

## Recursos e configurações

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
