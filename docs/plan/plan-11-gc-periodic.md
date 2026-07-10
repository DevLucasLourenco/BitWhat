# Plan 11 — Coleta de lixo explícita periódica (GC)

**Spec de referência:** `docs/spec-11-gc-periodic.md`
**Prioridade:** P3 — Média
**Esforço total:** ~20min

## Tarefas

- [ ] **T1** — Em `main.ts`, antes de `app.requestSingleInstanceLock()`, adicionar `if (app.isPackaged) { app.commandLine.appendSwitch('js-flags', '--expose-gc') }`
- [ ] **T2** — Adicionar campos `gcInterval` e constante `GC_INTERVAL_MS = 30 * 60 * 1000` no `WindowManager`
- [ ] **T3** — Implementar `startPeriodicGc()`, `stopPeriodicGc()` e `runGarbageCollection()` privados
- [ ] **T4** — Em `create()`, chamar `startPeriodicGc()` somente se `app.isPackaged`
- [ ] **T5** — Em `quit()`, chamar `stopPeriodicGc()`
- [ ] **T6** — Em handler `closed` de `bindWindowEvents()`, chamar `stopPeriodicGc()`
- [ ] **T7** — Rodar `npm run typecheck`
- [ ] **T8** — Teste em dev: validar que GC não é chamado (log não aparece)
- [ ] **T9** — Teste em prod (build empacotado): rodar app por 30min e validar log "GC executado"
- [ ] **T10** — Teste em prod: validar que RSS cai após GC no Task Manager

## Ordem de execução

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10

## Arquivos a modificar

- `src/main/main.ts` (T1)
- `src/main/services/window-manager.ts` (T2–T6)

## Critério de aceite

- Em dev: `global.gc` não existe/não é chamado
- Em prod: a cada 30min log "GC executado" aparece
- Memória RSS cai visivelmente após GC
- App não congela durante GC (pause <200ms)
- Fechar app não deixa intervalo pendente
- `npm run typecheck` sem erros

## Observação

Spec de menor impacto — priorizar Specs 05 e 06 antes desta. Se T9 falhar (gc não exposto mesmo com flag), desativar e documentar.
