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

- Janela compacta dedicada ao WhatsApp Web. Sempre abre em 380×618 na última
  posição usada; pode ser redimensionada durante o uso.
- Ícone na bandeja do Windows para abrir, recarregar, limpar a sessão ou sair.
- Sessão persistente: o login permanece salvo entre as execuções, até que o
  usuário escolha limpar a sessão.
- Visualização de contatos ou de uma conversa específica.
- Modo de chat padrão ou mini, com redimensionamento automático da janela.
- Opção de manter a janela sempre no topo (botão de alfinete na barra superior).
- Balão flutuante opcional: um botão redondo sempre por cima das outras
  janelas, no lugar que você escolher.
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

## Publicar uma versão (atualização automática)

O BitWhat instalado procura atualizações nas
[Releases do GitHub](https://github.com/DevLucasLourenco/BitWhat/releases)
5 s depois de abrir e a cada 6 h. Quando encontra uma versão nova, baixa em
segundo plano, avisa (notificação do Windows e faixa no topo) e instala ao sair
ou pelo botão `Reiniciar agora`.

A publicação roda nesta máquina, sem GitHub Actions:

```bash
npm version patch --no-git-tag-version   # ou minor / major
git commit -am "chore: release X.Y.Z" && git push
npm run release
```

O passo a passo completo, com pré-requisitos, o que o comando confere, os
arquivos publicados e a solução de problemas, está em
[`docs/RELEASE.md`](docs/RELEASE.md).

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
- `Silenciar notificações` (marcável; fica salvo entre execuções e vale na hora,
  sem recarregar: a sessão do WhatsApp perde a permissão de notificação)
- `Sair`

## Recursos e configurações

- Tela de login com a identidade do BitWhat: enquanto o QR Code estiver na
  página, uma camada com logo, nome e instruções cobre a tela e o QR real do
  WhatsApp fica centralizado num card (`whatsapp-login-screen.ts`). O link
  `Entrar com número de telefone` abre o fluxo do próprio WhatsApp. A camada
  some ao concluir o login.
- Autodiagnóstico: com o WhatsApp carregado, o app confere a cada 20 s se os
  pontos da página dos quais depende (lista de conversas, grade, conversa
  aberta, campo de digitação) continuam existindo (`whatsapp-health.ts`). Só a
  estrutura é verificada, nunca o conteúdo. Se um ponto some por 3 verificações
  seguidas, o log registra e a engrenagem ganha um ponto amarelo; o painel de
  configurações explica quais funções podem falhar. O aviso some sozinho quando
  a página volta ao esperado.
- Recuperação automática: se o processo do WhatsApp cair (tela azul-escura sem
  resposta), o app recarrega sozinho; se a página travar por 30 s, o processo
  é reiniciado. Após 3 quedas em 10 minutos, mostra o aviso e o botão
  `Tentar novamente`. Eventos técnicos ficam em `%APPDATA%\BitWhat\logs\bitwhat.log`
  (sem conteúdo de conversas).
- Envio de arquivos: o menu `+` (Documento, Fotos e vídeos, Câmera...) e o
  editor de envio do WhatsApp aparecem completos — prévia, legenda,
  ferramentas, miniaturas com remover, `Adicionar arquivo`, `Fechar` e
  `Enviar` — para foto, vídeo, documento, arquivo colado ou arrastado. A janela
  aumenta enquanto o editor está aberto e volta ao tamanho anterior ao fechar.
- Clique direito: menus do próprio WhatsApp (mensagens, conversas) aparecem; no
  campo de texto há `Desfazer`, `Refazer`, `Recortar`, `Copiar`, `Colar`
  (inclusive imagem/arquivo copiado) e `Selecionar tudo`, com sugestões do
  corretor ortográfico; em links, `Abrir no navegador` e `Copiar link`.
- Painel de emojis, GIFs e figurinhas: abre ajustado à largura da janela,
  também no `Mini` (do topo até o campo de texto).
- `Esc`: fecha o que estiver aberto (menu, diálogo, painel de emojis, editor de
  envio); numa conversa sem nada aberto, volta aos contatos.
- Mensagens enviadas em cinza (`#505050` no escuro, `#d4d4d4` no claro).
- Conversas em grade: a lista de contatos vira cartões (foto, nome, hora e a
  prévia da última mensagem embaixo), de 2×2 na janela padrão até 5×5 em
  janelas grandes: as colunas crescem com a largura (cartões de ~170 px, até
  5) e as linhas visíveis com a altura (cartões de pelo menos ~130 px). Para caber mais linhas, a
  lista usa zoom e o conteúdo dos cartões o zoom inverso, então texto e fotos
  ficam no tamanho normal. Os cartões são as próprias linhas do WhatsApp
  reposicionadas (`whatsapp-chat-grid.ts`), então clique, selos, menu de
  contexto e a rolagem sob demanda continuam funcionando. Na busca, que mistura
  itens de alturas diferentes, a lista normal volta automaticamente.
- Teclado na grade: setas `←` `→` andam uma conversa e `↑` `↓` uma linha de
  cartões, rolando a lista até o cartão (contorno verde); `Enter` abre a
  conversa e `Esc` volta à grade, retomando da última conversa visitada.
- A tela só passa para o chat quando uma conversa de fato abre; se o chat for
  pedido sem conversa, o WhatsApp não aparece "cru" (barra lateral, lista
  cortada) e o app volta aos contatos.
- Aviso "Baixar o WhatsApp para Windows" / "Use o app para acessar o histórico"
  escondido sempre que o WhatsApp o insere (`whatsapp-download-promo.ts`); só o
  bloco do aviso é ocultado.
- Navegação automática: clicar em um contato abre o chat; no chat, o botão de sidebar volta aos contatos.
- Ao entrar numa conversa (clique ou `Enter`), o campo de mensagem já fica
  selecionado para digitar, com o cursor no fim de um rascunho existente.
- Ao abrir uma conversa, ela começa no fim (última mensagem). A rolagem é
  mantida no fim enquanto o layout se ajusta (até 4 s) e para assim que o
  usuário rola por conta própria.
- Balão flutuante (`Balão flutuante` nas configurações): botão redondo com o
  logo, sempre por cima das outras janelas e fora da barra de tarefas. Arraste
  para onde quiser (a posição fica salva e é ajustada se o monitor mudar);
  clique para abrir/ocultar o BitWhat. Com `Abrir junto ao balão` ligado, a
  janela aparece ao lado dele; aberta de outro jeito (bandeja, atalho), volta à
  posição de antes, e arrastá-la enquanto encaixada torna a nova posição a
  definitiva. Botão direito: as conversas não lidas do topo da lista (abrem
  direto), `Abrir`/`Ocultar`, `Desativar balão` e `Sair`. Mostra o número de
  conversas não lidas, lido do título da página do WhatsApp (só o número).
- Troca rápida (`Conversas recentes`, ligável em Comportamento): `Ctrl+Tab` vai
  para a conversa anterior (na grade, para a última aberta), e no chat uma barra
  abaixo do topo mostra as conversas recentes. Os nomes ficam só na memória da
  página e do app, nunca no disco ou no log (`whatsapp-quick-switch.ts`).
- `Digitar para buscar` (Comportamento): na grade, começar a digitar já escreve
  na busca de conversas.
- Atalhos: `Ctrl+/` ou `F1` mostra a lista de atalhos. Depois do primeiro login,
  4 dicas curtas apresentam a grade, a troca rápida, os atalhos e o balão
  (revê-las em Configurações > Sobre > `Dicas`).
- Configurações em seções:
  - `Aparência`: formato do chat e tema.
  - `Comportamento`: `Balão flutuante`, `Abrir junto ao balão`, `Conversas
    recentes`, `Digitar para buscar`, `Iniciar com Windows` e `Iniciar na
    bandeja`.
  - `Notificações`: `Silenciar notificações`.
  - `Sobre`: versão, `Verificar atualizações`, resultado do autodiagnóstico,
    `Atalhos`, `Dicas` e `Logs` (abre a pasta de logs).
  - Sempre visíveis: `Limpar sessão`, `Ocultar` e `Sair`.
- A barra do topo só mostra o estado do WhatsApp quando há algo a dizer
  (carregando, aguardando login, erro).
- Formato do chat: `Padrão` ou `Mini`.
- O formato `Mini` reduz a janela (440 px de largura) e mostra a conversa em
  coluna única: cabeçalho em linha (foto + nome), mensagens e campo de texto.
- `Iniciar com Windows` abre a janela normalmente; para abrir oculto na
  bandeja, ative também `Iniciar na bandeja`.
- Tema claro, escuro ou sistema para a tela interna e para o WhatsApp Web.
  O padrão é `Escuro`: ao iniciar, o app aplica `nativeTheme.themeSource`, e
  o preload do WhatsApp (`src/preload/whatsapp-preload.ts`) grava
  `system-theme-mode = true` antes do WhatsApp carregar, para que ele siga o
  tema do BitWhat mesmo que tenha sido fixado como "Claro" dentro do WhatsApp.
  Esse preload não expõe nenhuma API à página.

## Arquitetura

```text
src/
  main/
    main.ts
    ipc.ts
    services/
      window-manager.ts
      tray-manager.ts
      bubble-manager.ts
      whatsapp-health.ts
      whatsapp-quick-switch.ts
      auto-updater.ts
      session-manager.ts
      settings-store.ts
      navigation-guard.ts
  preload/
    preload.ts
    whatsapp-preload.ts
    bubble-preload.ts
  renderer/
    index.html
    bubble.html
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
