# Plan 04 — Throttle no resize da janela

**Spec de referência:** `docs/spec-04-resize-throttle.md`
**Prioridade:** P2 — Alta
**Esforço total:** ~30min

## Tarefas

- [ ] **T1** — Adicionar campos `resizeRafId`, `rafScheduler` e `rafCanceler` no `WindowManager` com fallback para `setTimeout`/`clearTimeout`
- [ ] **T2** — Implementar `scheduleResizeUpdate()` que cancela RAF pendente e agenda novo
- [ ] **T3** — Substituir handler `resize` para chamar `scheduleResizeUpdate()` em vez de `updateWhatsAppBounds()` direto
- [ ] **T4** — Cancelar RAF em handler `closed` de `bindWindowEvents()`
- [ ] **T5** — Em `applyPanelWindowMode()`, chamar `updateWhatsAppBounds()` síncrono após `setContentSize`/`setBounds` (não throttled)
- [ ] **T6** — Rodar `npm run typecheck`
- [ ] **T7** — Teste manual: redimensionar janela por 5s, validar CPU <20% no Task Manager
- [ ] **T8** — Teste manual: alternar Padrão ↔ Mini, validar ajuste instantâneo sem flicker

## Ordem de execução

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8

## Arquivos a modificar

- `src/main/services/window-manager.ts` (T1–T5)

## Critério de aceite

- Resize não dispara `updateWhatsAppBounds` mais que 1x por frame
- Modo Mini alterna instantaneamente (sem throttle)
- Fechar app não gera erro de RAF pendente
- `npm run typecheck` sem erros
