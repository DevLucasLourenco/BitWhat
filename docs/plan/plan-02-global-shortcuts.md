# Plan 02 — Atalhos globais de teclado

**Spec de referência:** `docs/spec-02-global-shortcuts.md`
**Prioridade:** P1 — Crítica
**Esforço total:** ~45min

## Tarefas

- [ ] **T1** — Importar `globalShortcut` de `electron` em `window-manager.ts`
- [ ] **T2** — Definir constantes `SHORTCUT_TOGGLE_WINDOW = 'CommandOrControl+Shift+W'` e `SHORTCUT_RELOAD_WHATSAPP = 'CommandOrControl+Shift+R'`
- [ ] **T3** — Implementar `registerGlobalShortcuts()` e `unregisterGlobalShortcuts()` (privados)
- [ ] **T4** — Chamar `registerGlobalShortcuts()` ao final de `create()`
- [ ] **T5** — Chamar `unregisterGlobalShortcuts()` em `quit()`
- [ ] **T6** — Expor método público `disposeGlobalShortcuts()` para chamada em `before-quit` do `main.ts`
- [ ] **T7** — Em `main.ts`, chamar `windowManager?.disposeGlobalShortcuts()` no handler `before-quit`
- [ ] **T8** — Rodar `npm run typecheck`
- [ ] **T9** — Teste manual: minimizar app e pressionar `Ctrl+Shift+W` → janela deve mostrar
- [ ] **T10** — Teste manual: com outra app focada, pressionar `Ctrl+Shift+R` → WhatsApp recarrega
- [ ] **T11** — Teste manual: sair do app e tentar registrar o mesmo atalho em outra app → deve estar livre

## Ordem de execução

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11

## Arquivos a modificar

- `src/main/services/window-manager.ts` (T1–T6)
- `src/main/main.ts` (T7)

## Critério de aceite

- `Ctrl+Shift+W` alterna visibilidade da janela (mesmo com outro app focado)
- `Ctrl+Shift+R` recarrega WhatsApp
- Falha de registro loga warning mas não quebra app
- Atalhos liberados ao sair do app
- `npm run typecheck` sem erros
