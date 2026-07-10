# Plan 01 — Timeout + retry no carregamento do WhatsApp

**Spec de referência:** `docs/spec-01-timeout-retry.md`
**Prioridade:** P1 — Crítica
**Esforço total:** ~1h

## Tarefas

- [ ] **T1** — Adicionar campos privados no `WindowManager` (`reloadAttempts`, `loadTimeoutTimer`, constantes `MAX_RELOAD_ATTEMPTS=3` e `LOAD_TIMEOUT_MS=25_000`)
- [ ] **T2** — Implementar `scheduleLoadTimeout()`, `clearLoadTimeout()` e `handleLoadTimeout()`
- [ ] **T3** — Chamar `scheduleLoadTimeout()` ao final de `loadWhatsApp()` e `reloadWhatsApp()`
- [ ] **T4** — Resetar `reloadAttempts` e chamar `clearLoadTimeout()` em `dom-ready` e `did-finish-load` quando estado for `ready`/`waiting-login`
- [ ] **T5** — Limpar timeout em `did-fail-load` antes de mostrar `connection-error`
- [ ] **T6** — Adicionar botão "Tentar novamente" no renderer (`App.tsx`) quando `status.state === 'connection-error'`
- [ ] **T7** — (Opcional) Adicionar `reloadAttempts?: number` em `WhatsAppStatus` (`types.ts`)
- [ ] **T8** — Rodar `npm run typecheck` e corrigir erros
- [ ] **T9** — Teste manual: desligar Wi-Fi, validar 3 retries e mensagem de erro
- [ ] **T10** — Teste manual: religar Wi-Fi durante retry, validar reset do contador

## Ordem de execução

T1 → T2 → T3 → T4 → T5 → T7 → T6 → T8 → T9 → T10

## Arquivos a modificar

- `src/main/services/window-manager.ts` (T1–T5)
- `src/renderer/src/App.tsx` (T6)
- `src/shared/types.ts` (T7, opcional)

## Critério de aceite

- Timeout dispara a 25s com retry automático até 3x
- Após 3 falhas, mostra `connection-error` com botão "Tentar novamente"
- Contador zera ao atingir `ready`/`waiting-login`
- `npm run typecheck` sem erros
