# Plan 05 — Limitar CPU quando minimizado na bandeja

**Spec de referência:** `docs/spec-05-background-throttle.md`
**Prioridade:** P2 — Alta
**Esforço total:** ~45min

## Tarefas

- [ ] **T1** — Implementar `setBackgroundThrottling(enabled: boolean)` privado no `WindowManager` que aplica a `whatsappView.webContents` e `mainWindow.webContents`
- [ ] **T2** — Em `hide()`, chamar `this.setBackgroundThrottling(true)`
- [ ] **T3** — Em `show()`, chamar `this.setBackgroundThrottling(false)` antes de `show()`
- [ ] **T4** — Em `create()`, após `createWhatsappView()`, chamar `setBackgroundThrottling(false)` para estado inicial explícito
- [ ] **T5** — Em `did-start-loading` de `bindWhatsAppEvents()`, restaurar throttling conforme visibilidade da janela
- [ ] **T6** — Rodar `npm run typecheck`
- [ ] **T7** — Teste manual: esconder app e validar CPU <1% no Task Manager
- [ ] **T8** — Teste manual: mostrar app e validar CPU volta ao normal
- [ ] **T9** — Teste manual: enviar msg de outro número enquanto app oculto, validar notificação chega (até 1s de delay aceitável)

## Ordem de execução

T1 → T4 → T2 → T3 → T5 → T6 → T7 → T8 → T9

## Arquivos a modificar

- `src/main/services/window-manager.ts` (T1–T5)

## Critério de aceite

- CPU cai para <1% quando app oculto
- CPU volta ao normal ao mostrar janela
- Notificações ainda chegam (aceitável até 1s de delay)
- `npm run typecheck` sem erros

## Observação

Se T9 falhar (notificações atrasadas demais), limitar throttle apenas a `mainWindow.webContents` e manter `whatsappView` sem throttle.
