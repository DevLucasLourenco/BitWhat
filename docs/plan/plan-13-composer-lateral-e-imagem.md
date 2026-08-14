# Plan 13 — Composer lateral preenchido e envio compacto de imagem

**Spec de referência:** `docs/spec/spec-13-composer-lateral-e-imagem.md`  
**Prioridade:** P1 — Alta  
**Esforço total:** ~1h30  
**Rastreabilidade:** 1 tarefa para cada requisito da Spec 13 (`R1` → `T1`, …,
`R8` → `T8`)

## Tarefas

- [ ] **T1 — R1** — Ajustar `WHATSAPP_PANEL_CSS` para transformar o composer
  normal em uma linha flex/grid sem quebra: ações essenciais em largura
  intrínseca, input com `min-width: 0`/`flex: 1 1 auto` e botão final em largura
  própria. Validar os dois caminhos de seletor: `#bitwhat-stage` e projeção
  conectada em `#app`.

- [ ] **T2 — R2** — Ajustar as regras de
  `#bitwhat-mini-chat-layout > [data-bitwhat-chat-composer="true"]` para
  preservar a coluna do composer, permitir expansão vertical controlada do
  preview e impedir overflow horizontal/clipping.

- [ ] **T3 — R3** — Criar no script de injeção uma rotina de identificação das
  ações essenciais por `data-testid`, `aria-label`, `data-icon` e semântica.
  Marcar o acionador de mídia, o input de arquivo, enviar/microfone e preview
  com atributos `data-bitwhat-*`; revisar a media query para não esconder o
  acionador de imagem.

- [ ] **T4 — R4** — Conectar a identificação ao fluxo nativo do WhatsApp: não
  criar uploader próprio, não mover o `File` e não disparar envio automático.
  Garantir que o menu/input de imagem continue clicável após a projeção e que
  a escolha do arquivo chegue ao DOM nativo.

- [ ] **T5 — R5** — Implementar a marcação idempotente do corpo nativo de
  preview/legenda e adicionar CSS compacto para miniatura, metadados,
  legenda, cancelar e enviar. Usar limite de `72px`/`132px` no chat padrão e
  `56px`/`96px` no mini-chat, com fallback seguro quando algum subelemento
  estiver ausente.

- [ ] **T6 — R6** — Integrar a rotina de marcação ao ciclo de
  `markChatComposer`, `refreshConnectedProjection`, `pruneChatPane` e ao
  `MutationObserver`. Atualizar `restoreState` para remover todos os atributos
  `data-bitwhat-*` novos e garantir que não haja listeners/nós duplicados.

- [ ] **T7 — R7** — Aplicar variáveis de tema existentes e revisar breakpoints
  desktop/mobile para manter foco, contraste, ordem de tabulação e controles
  de mídia acessíveis. Testar ao menos uma largura desktop e uma viewport
  estreita, nos temas claro e escuro quando disponíveis.

- [ ] **T8 — R8** — Verificar que a alteração toca apenas a injeção do
  `BrowserView`, sem IPC, rede, persistência ou mudança de CSP. Executar
  `npm run typecheck`, abrir o app e validar o fluxo completo de texto e
  imagem, incluindo troca de contato, reload e alternância `chat`/`mini-chat`.

## Ordem de execução

`T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8`

T1–T2 estabilizam a geometria antes de tocar no fluxo de mídia. T3–T5
preservam a descoberta e a aparência do fluxo nativo. T6 fecha o ciclo de
renderização dinâmica e restauração. T7–T8 fazem a validação visual, funcional
e de segurança.

## Arquivos a modificar

- `src/main/services/whatsapp-panel-mode.ts` — todas as tarefas T1–T8.

## Evidências esperadas

- Snapshot/inspeção do DOM mostrando
  `[data-bitwhat-chat-composer="true"]` com input ocupando o slot central.
- Screenshot do chat padrão com composer preenchido lateralmente.
- Screenshot do `mini-chat` com composer e preview compacto.
- Screenshot do estado de imagem selecionada com miniatura e legenda.
- Confirmação do envio como mensagem de imagem no chat.
- Saída limpa de `npm run typecheck` e console sem erros relevantes.

## Critério de conclusão

O plano estará concluído quando T1–T8 estiverem marcadas e todos os critérios
de aceite da Spec 13 forem demonstrados. Se o WhatsApp mudar o DOM e o preview
não puder ser encontrado, a implementação só poderá ser considerada parcial:
o diagnóstico deverá registrar o seletor/estado observado e T5 deverá ficar
pendente para decisão explícita.
