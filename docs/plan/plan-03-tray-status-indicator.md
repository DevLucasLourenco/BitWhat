# Plan 03 — Indicador visual de estado no tray

**Spec de referência:** `docs/spec-03-tray-status-indicator.md`
**Prioridade:** P1 — Crítica
**Esforço total:** ~1.5h

## Tarefas

- [ ] **T1** — Gerar 4 variantes do ícone tray no `scripts/generate-icons.mjs` (`tray.png`, `tray-loading.png`, `tray-attention.png`, `tray-error.png`) com cores de overlay (verde, amarelo, azul, vermelho)
- [ ] **T2** — Rodar `npm run icons` e confirmar geração dos 4 PNGs em `build/`
- [ ] **T3** — Importar `NativeImage`, `nativeImage` e `WhatsAppState` em `tray-manager.ts`
- [ ] **T4** — Adicionar mapeamentos `statusToImageKey` e `statusToTooltip` em `TrayManager`
- [ ] **T5** — Implementar `preloadImages()` e chamar em `create()`
- [ ] **T6** — Implementar `getImage(state)` com fallback para `tray.png`
- [ ] **T7** — Implementar `updateStatus(state: WhatsAppState)` público que troca imagem e tooltip
- [ ] **T8** — Adicionar `setTrayManager(trayManager)` no `WindowManager`
- [ ] **T9** — Em `WindowManager.setStatus()`, chamar `this.trayManager?.updateStatus(status.state)`
- [ ] **T10** — Em `main.ts`, após criar `trayManager`, chamar `windowManager.setTrayManager(trayManager)`
- [ ] **T11** — Rodar `npm run typecheck`
- [ ] **T12** — Teste manual: validar ícone verde quando conectado, amarelo carregando, azul aguardando login, vermelho em erro
- [ ] **T13** — Teste manual: validar tooltip dinâmico ao passar mouse no tray

## Ordem de execução

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T10 → T9 → T11 → T12 → T13

## Arquivos a modificar

- `scripts/generate-icons.mjs` (T1)
- `build/` (T2 — output)
- `src/main/services/tray-manager.ts` (T3–T7)
- `src/main/services/window-manager.ts` (T8, T9)
- `src/main/main.ts` (T10)

## Critério de aceite

- 4 PNGs gerados em `build/` com cores distintas
- Ícone do tray muda conforme estado do WhatsApp
- Tooltip exibe estado atual
- Fallback para `tray.png` se imagem específica não existir
- `npm run typecheck` sem erros
