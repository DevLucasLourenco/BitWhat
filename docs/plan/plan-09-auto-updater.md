# Plan 09 — Auto-updater (electron-updater)

**Spec de referência:** `docs/spec-09-auto-updater.md`
**Prioridade:** P3 — Média
**Esforço total:** ~2h

## Tarefas

- [ ] **T1** — Definir provider de publish (GitHub Releases vs generic server)
- [ ] **T2** — `npm install electron-updater@^6`
- [ ] **T3** — Configurar `publish` em `electron-builder.yml`
- [ ] **T4** — Criar `src/main/services/auto-updater.ts` com `setupAutoUpdater()` e `disposeAutoUpdater()`
- [ ] **T5** — Adicionar canais `updateReady` e `installUpdate` em `src/shared/ipc.ts`
- [ ] **T6** — Adicionar `onUpdateReady` e `installUpdate` em `BitWhatApi` (`src/shared/api.ts`)
- [ ] **T7** — Expor no preload (`src/preload/preload.ts`)
- [ ] **T8** — Inicializar em `main.ts` após `windowManager.create()` (só se `app.isPackaged`)
- [ ] **T9** — Adicionar `disposeAutoUpdater()` em `before-quit`
- [ ] **T10** — Adicionar banner de update no renderer (`App.tsx`) com botão "Reiniciar agora"
- [ ] **T11** — Adicionar estilos `.update-banner` em `styles.css`
- [ ] **T12** — Rodar `npm run typecheck`
- [ ] **T13** — Teste em dev: validar log "Auto-updater desativado em desenvolvimento"
- [ ] **T14** — Teste em prod (build empacotado): criar release fake no GitHub e validar checagem
- [ ] **T15** — Teste em prod: validar download automático e banner ao concluir
- [ ] **T16** — Teste em prod: clicar "Reiniciar agora" e validar instalação

## Ordem de execução

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16

## Arquivos a modificar

- `package.json` (T2)
- `electron-builder.yml` (T3)
- `src/main/services/auto-updater.ts` (T4 — novo)
- `src/shared/ipc.ts` (T5)
- `src/shared/api.ts` (T6)
- `src/preload/preload.ts` (T7)
- `src/main/main.ts` (T8, T9)
- `src/renderer/src/App.tsx` (T10)
- `src/renderer/src/styles.css` (T11)

## Critério de aceite

- Desativado em dev (log)
- Em prod: checa update 5s após iniciar e a cada 6h
- Update disponível baixa em background
- Banner aparece ao concluir download
- "Reiniciar agora" instala e reinicia
- Offline falha silenciosamente sem quebrar app
- `npm run typecheck` sem erros

## Dependência externa

- Definir repo GitHub (T1) antes de configurar `electron-builder.yml`
- Para publish automatizado, depende de Spec 10 (CI/CD) ou `GH_TOKEN` local
