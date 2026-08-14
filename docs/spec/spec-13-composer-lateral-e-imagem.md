# Spec 13 — Composer lateral preenchido e envio compacto de imagem

**Prioridade:** P1 — Alta  
**Esforço estimado:** ~1h30  
**Arquivos afetados:** `src/main/services/whatsapp-panel-mode.ts`  
**Plano:** `docs/plan/plan-13-composer-lateral-e-imagem.md`

## Contexto

O commit `24dbe79` (`feat: finishes the appear of the chat component`) identificou
e preservou o composer do WhatsApp Web mesmo quando ele aparece fora do painel
principal. O ponto de extensão atual é:

- `WHATSAPP_PANEL_CSS`: injeta o CSS no `BrowserView` do WhatsApp;
- `findChatComposer`: localiza `footer`, `form`, `[role="form"]` ou o pai do
  textbox;
- `markChatComposer`: marca o elemento com
  `data-bitwhat-chat-composer="true"`;
- `pruneChatPane` e `refreshConnectedProjection`: mantêm o composer vivo
  durante a projeção do chat.

O campo agora aparece, mas ainda pode ficar estreito/quebrado lateralmente,
principalmente quando o WhatsApp monta o conjunto de ações e o input em
containers flexíveis diferentes. Em larguras menores, as regras atuais também
podem esconder ações que são necessárias para abrir o fluxo de mídia.

## Objetivo

Entregar uma segunda injeção visual e comportamental, específica do composer,
que:

1. faça o campo de texto ocupar de forma estável o espaço lateral disponível;
2. mantenha as ações essenciais visíveis e sem quebra;
3. exponha o fluxo nativo de anexo de imagem do WhatsApp Web;
4. apresente o estado de imagem selecionada em um corpo compacto, adequado ao
   BitWhat, com preview, legenda e ações de cancelar/enviar quando esses
   elementos forem fornecidos pelo WhatsApp;
5. funcione no chat padrão e no layout `mini-chat`, sem duplicar o uploader.

## Fora de escopo

- Criar uma API própria de mensagens ou enviar imagem por IPC.
- Ler, converter, armazenar, cachear ou persistir o conteúdo do arquivo.
- Substituir o `input[type="file"]`, o menu de anexo ou o botão de envio nativos.
- Automatizar envio sem uma ação explícita do usuário.
- Reproduzir o WhatsApp Web inteiro em HTML estático.

## Requisitos funcionais

### R1 — Composer lateral estável

No estado `chat`, o composer marcado por
`[data-bitwhat-chat-composer="true"]` deve usar uma linha sem quebra, com três
áreas lógicas:

```text
[ações essenciais] [input flexível ocupando o restante] [enviar/microfone]
```

O input deve ter `min-width: 0`, `flex: 1 1 auto` e largura efetiva de 100% do
seu slot. Nenhum container intermediário pode limitar o campo a uma largura
fixa ou permitir que ele seja empurrado para uma segunda linha.

### R2 — Composer compacto do mini-chat

No estado `mini-chat`, a linha do composer deve continuar na coluna de conteúdo
do `#bitwhat-mini-chat-layout`, respeitando a largura disponível. O preview de
imagem, quando aberto, deve aumentar a altura somente até o limite definido
para o mini-chat, sem empurrar o painel para fora da janela nem criar scroll
horizontal.

### R3 — Ações essenciais preservadas

O CSS responsivo não pode ocultar o acionador nativo de anexo/mídia, o input de
arquivo associado, o botão de enviar, o botão de microfone quando aplicável ou
os controles nativos do preview de mídia. Ações secundárias podem ser
reduzidas/ocultadas em larguras pequenas, desde que o fluxo de imagem continue
acessível.

Os seletores devem priorizar `data-testid`, `aria-label`, `data-icon` e
semântica (`button`, `input[type="file"]`), evitando depender de classes
geradas pelo WhatsApp.

### R4 — Abertura do fluxo nativo de imagem

Ao clicar no acionador de anexo/mídia visível no composer, o usuário deve
conseguir escolher uma imagem usando o fluxo já fornecido pelo WhatsApp Web.
Depois da escolha, o BitWhat deve manter o DOM nativo conectado e não deve
interceptar nem duplicar o `File`.

O comportamento esperado é:

```text
composer normal → anexo/mídia → escolha de imagem → preview/legenda nativo
                 → enviar nativo → mensagem de imagem no chat
```

### R5 — Corpo compacto de envio de imagem

Quando o WhatsApp montar o estado de mídia selecionada, a injeção deve
identificar e marcar o corpo de preview com atributos `data-bitwhat-*` estáveis
para estilização. A apresentação deve ser compacta e conter, quando presentes
no DOM nativo:

- preview/miniatura da imagem;
- nome ou informação resumida do arquivo;
- campo de legenda;
- ação para remover/cancelar;
- ação nativa para enviar.

O layout preferencial é uma linha/grade curta com miniatura de até `72px` no
chat padrão e `56px` no mini-chat. A área total do preview deve ficar em até
`132px` no chat padrão e `96px` no mini-chat, salvo se o próprio WhatsApp
exigir altura maior para manter acessibilidade.

### R6 — Compatibilidade com renderização dinâmica

O WhatsApp pode montar ou desmontar o composer e o preview após navegação,
seleção de contato, mudança de largura ou troca de tema. A rotina de
observação existente deve reaplicar as marcações e o CSS sem duplicar nós,
listeners ou previews.

Ao sair do painel ou restaurar o estado, todos os atributos e nós auxiliares do
BitWhat devem ser removidos/restaurados da mesma forma que
`data-bitwhat-chat-composer` e `data-bitwhat-panel-hidden`.

### R7 — Tema e responsividade

As regras devem usar as variáveis já injetadas por
`WHATSAPP_THEME_CSS` sempre que possível, mantendo leitura em tema claro e
escuro. Em larguras reduzidas:

- manter o input utilizável;
- manter o acionador de imagem e o envio acessíveis;
- reduzir espaçamentos e a miniatura antes de esconder ações secundárias;
- impedir overflow horizontal e clipping do preview.

### R8 — Segurança, privacidade e não regressão

O fluxo deve permanecer dentro da sessão persistente do WhatsApp Web e das
permissões já existentes do Electron. A implementação não pode:

- enviar arquivo para o processo principal;
- adicionar endpoint, `fetch`, `FileReader`, base64 ou armazenamento local;
- alterar a CSP para permitir uma origem nova;
- remover o isolamento `contextIsolation`/`sandbox`;
- degradar o chat de texto, a troca de contatos, o `mini-chat` ou a restauração
  do DOM.

## Decisões técnicas

- Centralizar o CSS novo em `WHATSAPP_PANEL_CSS`, junto às regras atuais do
  composer, em vez de criar uma folha externa no renderer.
- Adicionar helpers pequenos no script retornado por
  `createEnableWhatsAppPanelScript` para marcar controles e preview somente
  quando forem encontrados.
- Reutilizar os elementos nativos do WhatsApp e usar `MutationObserver` já
  existente para acompanhar o ciclo de vida.
- Manter o prefixo de atributos `data-bitwhat-` para facilitar diagnóstico e
  limpeza.
- Não assumir classes internas ou uma versão única do WhatsApp Web; manter
  fallbacks semânticos e registrar diagnóstico quando o preview não for
  localizado.

## Critérios de aceite

- [ ] O composer padrão ocupa a largura lateral disponível sem quebrar em duas
  linhas.
- [ ] O input continua focável e digitável após a injeção.
- [ ] O acionador nativo de anexo/imagem permanece acessível em desktop,
  largura reduzida e `mini-chat`.
- [ ] Uma imagem pode ser escolhida pelo fluxo nativo do WhatsApp e o preview
  compacto aparece sem overflow.
- [ ] Legenda, cancelar/remover e enviar continuam acionando os controles
  nativos correspondentes.
- [ ] O envio resulta em uma mensagem de imagem no chat, sem implementação de
  transporte paralelo pelo BitWhat.
- [ ] Trocar de contato, recarregar o WhatsApp e alternar entre `chat` e
  `mini-chat` não duplica preview nem perde o composer.
- [ ] Tema claro/escuro e larguras desktop/mobile continuam legíveis.
- [ ] `npm run typecheck` passa.
- [ ] A validação renderizada não apresenta erro de framework nem erro relevante
  no console.

## Riscos e mitigação

- **Mudança de DOM do WhatsApp:** usar vários sinais semânticos e manter o
  diagnóstico existente; não depender de classes.
- **Preview não localizado em uma variante:** manter o envio nativo funcional e
  aplicar apenas o layout do composer; registrar a ausência para ajuste futuro.
- **Ação escondida no mobile:** cobrir o acionador de mídia explicitamente nas
  regras responsivas e validar em viewport estreita.
- **Observer reprocessando excessivamente:** reaplicar apenas atributos/classes
  idempotentes e não criar elementos por ciclo.
- **Acessibilidade reduzida por compactação:** preservar labels, foco, ordem de
  tabulação e controles nativos; compactar espaçamento, não remover semântica.
