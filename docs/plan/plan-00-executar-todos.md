# Plan 00 — Executar Todos (Plan 01 ao Plan 10)

**Tipo:** Plano integrador / checklist mestre
**Escopo:** Implementar as Specs 01–10 numa sequência estruturada, respeitando dependências entre espeficas
**Esforço total estimado:** ~9h
**Repositório referência:** todos os arquivos estão sob `docs/spec-NN-*.md` e `docs/plan-NN-*.md`

---

## Visão geral

Este plano orquestra a execução dos Plans 01–10 em sequência lógica — não na ordem numérica rígida.
Algumas espeficas têm dependências técnicas entre si e precisam ser aplicadas em fases para:

1. Evitar conflitos de merge entre espeficas que mexem no mesmo arquivo.
2. Garantir que cada espefica seja verificável antes da próxima começar.
3. Reduzir retrabalho (ex.: se o typecheck apertar em P8, os arquivos já passaram pelas mudanças anteriores).

### Mapa de dependências

```
P1  Timeout+retry        ──┐
P2  Global shortcuts      ──┤
P3  Tray status indicator ──┴─► estimatorذر standalone no window-manager.ts
P4  Resize throttle      ─────► window-manager.ts (handler resize)
P5  Background throttle   ────► window-manager.ts (hide/show)
P6  Cache aggressive     ─────► session-manager.ts (onHeadersReceived)
P7  CSP refined          ─────► session-manager.ts (onHeadersReceived) + index.html
                          \__  P6 e P7 conflitam no mesmo handler — implementar juntos
P8  TypeScript strict    ─────► tsconfig.json + correções (deve ir por último entre P1–P10)
P9  Auto-updater         ─────► novos arquivos, main.ts, preload, renderer
P10 CI/CD GitHub Actions ─────► .github/workflows/build.yml (novo — independente)
```

### Arquivos compartilhados

| Arquivo | Espeficas que tocam |
|--------|---------------------|
| `src/main/services/window-manager.ts` | P1, P2, P3, P4, P5 |
| `src/main/services/session-manager.ts` | P6, P7 |
| `src/main/main.ts` | P2, P3 (se,setTrayManager), P9 |
| `src/shared/types.ts` | P1 (opcional), P3 |
| `src/shared/ipc.ts` | P9 |
| `src/shared/api.ts` | P9 |
| `src/preload/preload.ts` | P9 |
| `src/renderer/src/App.tsx` | P1, P12 (fora deste plano) |
| `src/renderer/index.html` | P7 |
| `tsconfig.json` | P8 |
| `electron-builder.yml` | P9 |
| `.github/workflows/build.yml` | P10 (novo) |

### Sequência ótima

1. **Fase A — Window-manager** (uma só passagem): P1 + P2 + P3 + P4 + P5
2. **Fase B — Session-manager** (uma só passagem): P6 + P7 juntos (mesmo handler)
3. **Fase C — Auto-updater (P9)** — isolado em novos arquivos
4. **Fase D — CI/CD (P10)** — isolado em novo arquivo
5. **Fase E — TypeScript strict (P8)** — no final para limpar tudo de uma vez

---

## Pré-requisitos globais

Antes de começar qualquer fase:

- [ ] **G0** — Confirmar branch atual: `git status` deve mostrar tudo limpo
- [ ] **G1** — Criar branch de trabalho: `git checkout -b feat/optimization-p1-p10`
- [ ] **G2** — Rodar `npm run typecheck` e anotar baseline (provável: zero erros)
- [ ] **G3** — Rodar `npm run build:win` e anotar baseline (instalador deve gerar)
- [ ] **G4** — Backup mental: anotar tamanho de `out/renderer/assets/index-*.js` para comparação depois
- [ ] **G5** — Confirmar versão do Electron: `npm ls electron` (deve ser `^42.2.0`)

---

## Fase A — Window-manager (P1 + P2 + P3 + P4 + P5)

**Arquivo alvo principal:** `src/main/services/window-manager.ts`
**Também afeta:** `src/shared/types.ts`, `src/main/main.ts`, `src/main/services/tray-manager.ts`, `scripts/generate-icons.mjs`, `build/`

### A.1 — Espefica 01: Timeout + retry no carregamento do WhatsApp

**Spec:** `docs/spec-01-timeout-retry.md` · **Plan detalhado:** `docs/plan-01-timeout-retry.md`

- [ ] **A.1.T1** — Adicionar campos no `WindowManager`: `reloadAttempts`, `loadTimeoutTimer`, `MAX_RELOAD_ATTEMPTS=3`, `LOAD_TIMEOUT_MS=25_000`
- [ ] **A.1.T2** — Implementar `scheduleLoadTimeout()`, `clearLoadTimeout()`, `handleLoadTimeout()`
- [ ] **A.1.T3** — Chamar `scheduleLoadTimeout()` ao final de `loadWhatsApp()` e `reloadWhatsApp()`
- [ ] **A.1.T4** — Em `dom-ready` e `did-finish-load`, chamar `clearLoadTimeout()` e resetar `reloadAttempts` se `ready`/`waiting-login`
- [ ] **A.1.T5** — Em `did-fail-load`, chamar `clearLoadTimeout()` antes de mostrar `connection-error`
- [ ] **A.1.T6** — (Opcional) Adicionar `reloadAttempts?: number` em `WhatsAppStatus` (`src/shared/types.ts`)
- [ ] **A.1.T7** — Adicionar botão "Tentar novamente" no renderer (`App.tsx`) quando `state === 'connection-error'`
- [ ] **A.1.V** — **Verificação intermediária:** `npm run typecheck` ok · desligar Wi-Fi e validar 3 retries + botão

### A.2 — Espefica 02: Atalhos globais de teclado

**Spec:** `docs/spec-02-global-shortcuts.md` · **Plan detalhado:** `docs/plan-02-global-shortcuts.md`

- [ ] **A.2.T1** — Importar `globalShortcut` de `electron` em `window-manager.ts`
- [ ] **A.2.T2** — Definir `SHORTCUT_TOGGLE_WINDOW = 'CommandOrControl+Shift+W'` e `SHORTCUT_RELOAD_WHATSAPP = 'CommandOrControl+Shift+R'`
- [ ] **A.2.T3** — Implementar `registerGlobalShortcuts()` e `unregisterGlobalShortcuts()` (privados)
- [ ] **A.2.T4** — Chamar `registerGlobalShortcuts()` ao final de `create()`
- [ ] **A.2.T5** — Chamar `unregisterGlobalShortcuts()` em `quit()`
- [ ] **A.2.T6** — Expor `disposeGlobalShortcuts()` público e chamar em `before-quit` de `main.ts`
- [ ] **A.2.V** — **Verificação intermediária:** `Ctrl+Shift+W` toggle janela · `Ctrl+Shift+R` reload · atalhos liberados ao sair

### A.3 — Espefica 03: Indicador visual de estado no tray

**Spec:** `docs/spec-03-tray-status-indicator.md` · **Plan detalhado:** `docs/plan-03-tray-status-indicator.md`

**Atenção:** Cria assets novos e mexe em `tray-manager.ts` + `window-manager.ts` + `main.ts`. Fazer esta espefica antes de P4/P5 para que P4/P5 já encontrem a estrutura estável.

- [ ] **A.3.T1** — Estender `scripts/generate-icons.mjs` para gerar 4 variantes: `tray.png` (verde), `tray-loading.png` (amarelo), `tray-attention.png` (azul), `tray-error.png` (vermelho)
- [ ] **A.3.T2** — Rodar `npm run icons` e validar 4 PNGs em `build/` (16x16 e 32x32)
- [ ] **A.3.T3** — Em `tray-manager.ts`, importar `NativeImage`, `nativeImage` e tipo `WhatsAppState`
- [ ] **A.3.T4** — Adicionar mapeamentos `statusToImageKey` e `statusToTooltip`
- [ ] **A.3.T5** — Implementar `preloadImages()` e chamar em `create()`
- [ ] **A.3.T6** — Implementar `getImage(state)` com fallback para `tray.png`
- [ ] **A.3.T7** — Implementar `updateStatus(state)` público que troca `setImage` e `setToolTip`
- [ ] **A.3.T8** — Adicionar `private trayManager?: TrayManager` e `setTrayManager(trayManager)` em `WindowManager`
- [ ] **A.3.T9** — Em `WindowManager.setStatus()`, chamar `this.trayManager?.updateStatus(status.state)`
- [ ] **A.3.T10** — Em `main.ts` após `trayManager.create()`, chamar `windowManager.setTrayManager(trayManager)`
- [ ] **A.3.V** — **Verificação intermediária:** ícone muda cor conforme estado · tooltip dinâmico · fallback funciona

### A.4 — Espefica 04: Throttle no resize

**Spec:** `docs/spec-04-resize-throttle.md` · **Plan detalhado:** `docs/plan-04-resize-throttle.md`

- [ ] **A.4.T1** — Adicionar `resizeRafId`, `rafScheduler` (com fallback setTimeout) e `rafCanceler` no `WindowManager`
- [ ] **A.4.T2** — Implementar `scheduleResizeUpdate()`
- [ ] **A.4.T3** — Substituir handler `resize` para usar `scheduleResizeUpdate()`
- [ ] **A.4.T4** — Cancelar RAF em handler `closed`
- [ ] **A.4.T5** — Em `applyPanelWindowMode()`, chamar `updateWhatsAppBounds()` síncrono após `setContentSize`
- [ ] **A.4.V** — **Verificação intermediária:** resize não passa de 20% CPU · modo Mini instantâneo

### A.5 — Espefica 05: Background throttle

**Spec:** `docs/spec-05-background-throttle.md` · **Plan detalhado:** `docs/plan-05-background-throttle.md`

- [ ] **A.5.T1** — Implementar `setBackgroundThrottling(enabled)` privado em `WindowManager` (aplica a `whatsappView` e `mainWindow`)
- [ ] **A.5.T2** — Em `hide()`, chamar `setBackgroundThrottling(true)`
- [ ] **A.5.T3** — Em `show()`, chamar `setBackgroundThrottling(false)` antes de `show()`
- [ ] **A.5.T4** — Em `create()`, chamar `setBackgroundThrottling(false)` para estado inicial
- [ ] **A.5.T5** — Em `did-start-loading`, restaurar throttling conforme visibilidade
- [ ] **A.5.V** — **Verificação intermediária:** CPU <1% quando oculto · notificações chegam com ≤1s delay

### Verificação da Fase A

- [ ] **A.V1** — `npm run typecheck` sem erros
- [ ] **A.V2** — `npm run dev` — app abre, WhatsApp carrega, atalhos funcionam, ícone muda, resize fluido, CPU ok ao esconder
- [ ] **A.V3** — Commit: `feat(window-manager): P1–P5 timeout, shortcuts, tray, throttle resize/background`

---

## Fase B — Session-manager (P6 + P7 juntos)

**Arquivo alvo:** `src/main/services/session-manager.ts`
**Também afeta:** `src/renderer/index.html`

**Por que juntos:** P6 e P7 mexem no mesmo `onHeadersReceived`. Se implementadas separadamente, a segunda sobrescreve a primeira. Implementar num único handler.

### B.1 — Espefica 06 + 07: Cache agressivo + CSP refinada

**Specs:** `docs/spec-06-cache-aggressive.md` + `docs/spec-07-csp-refined.md`
**Plans:** `docs/plan-06-cache-aggressive.md` + `docs/plan-07-csp-refined.md`

#### B.1.1 — CSP no renderer (`index.html`)

- [ ] **B.1.1.T1** — Atualizar meta CSP em `src/renderer/index.html`:
  - Adicionar `data: blob:` a `img-src`
  - Adicionar `media-src 'none'`
  - Adicionar `frame-src 'none'`
  - Adicionar `form-action 'self'`
  - Adicionar `worker-src 'self'`
  - Manter `connect-src` com localhost para dev HMR
- [ ] **B.1.1.T2** — (Opcional) CSP condicional dev/prod via Vite env `VITE_CSP_CONNECT_EXTRA` — adiar se complexo

#### B.1.2 — Handler único em `session-manager.ts`

- [ ] **B.1.2.T1** — Definir constantes `STATIC_RESOURCE_TYPES` (Set de `stylesheet|script|image|font`) e `CACHEABLE_CACHE_CONTROL = 'public, max-age=86400, immutable'`
- [ ] **B.1.2.T2** — Implementar `isCacheableOrigin(url)` privado (whatsapp.com, whatsapp.net, fbcdn.net)
- [ ] **B.1.2.T3** — Adicionar handler único `onHeadersReceived` em `configure()` com a lógica combinada:
  - Se origem é WhatsApp: adicionar `X-Content-Type-Options: nosniff` e `X-Frame-Options: DENY`
  - Se `resourceType` é estático e origem cacheable: sobrescrever `Cache-Control` (respeitando `no-store`/`no-cache` existente)
- [ ] **B.1.2.T4** — Garantir que o handler substitui completamente qualquer `onHeadersReceived` existente (não deve haver dois)

### Verificação da Fase B

- [ ] **B.V1** — `npm run typecheck` sem erros
- [ ] **B.V2** — Em dev: abrir DevTools Console no renderer → zero erros de CSP · HMR Vite funciona
- [ ] **B.V3** — Inspecionar BrowserView do WhatsApp via `--remote-debugging-port=9229`:
  - Headers `X-Content-Type-Options` e `X-Frame-Options` presentes em respostas do WhatsApp
  - `Cache-Control: immutable` em estáticos
  - `xhr`/`mainFrame` não modificados
- [ ] **B.V4** — Recarregar WhatsApp e validar `(disk cache)` em estáticos no Network
- [ ] **B.V5** — Commit: `feat(session): P6+P7 cache aggressive + CSP refined`

---

## Fase C — Auto-updater (P9)

**Spec:** `docs/spec-09-auto-updater.md` · **Plan detalhado:** `docs/plan-09-auto-updater.md`
**Arquivos novos:** `src/main/services/auto-updater.ts`
**Arquivos modificados:** `package.json`, `electron-builder.yml`, `src/main/main.ts`, `src/shared/ipc.ts`, `src/shared/api.ts`, `src/preload/preload.ts`, `src/renderer/src/App.tsx`, `src/renderer/src/styles.css`

### C.1 — Setup e dependências

- [ ] **C.1.T1** — Definir provider de publish (recomendado: GitHub Releases) e identificar `<org>/<repo>` no GitHub
- [ ] **C.1.T2** — `npm install electron-updater@^6`
- [ ] **C.1.T3** — Adicionar bloco `publish` em `electron-builder.yml`:
  ```yaml
  publish:
    provider: github
    owner: <org>
    repo: bitwhat
    releaseType: release
  ```

### C.2 — Serviço auto-updater

- [ ] **C.2.T1** — Criar `src/main/services/auto-updater.ts` com `setupAutoUpdater(mainWindow)` e `disposeAutoUpdater()`
- [ ] **C.2.T2** — Lógica: pular se `!app.isPackaged` · `autoUpdater.autoDownload = true` · `autoInstallOnAppQuit = true`
- [ ] **C.2.T3** — Event listeners: `checking-for-update`, `update-available`, `update-not-available`, `download-progress`, `update-downloaded`, `error`
- [ ] **C.2.T4** — Em `update-downloaded`, enviar IPC `IPC.updateReady` com `{ version }` ao renderer
- [ ] **C.2.T5** — Checagem inicial 5s após ready + checagem periódica a cada 6h
- [ ] **C.2.T6** — Registrar `ipcMain.handle(IPC.installUpdate, () => autoUpdater.quitAndInstall())`

### C.3 — IPC e preload

- [ ] **C.3.T1** — Adicionar `updateReady: 'app:update-ready'` e `installUpdate: 'app:install-update'` em `src/shared/ipc.ts`
- [ ] **C.3.T2** — Adicionar `onUpdateReady` e `installUpdate` em `BitWhatApi` (`src/shared/api.ts`)
- [ ] **C.3.T3** — Expor no preload (`src/preload/preload.ts`) via `contextBridge`

### C.4 — Inicialização em `main.ts`

- [ ] **C.4.T1** — Importar `setupAutoUpdater` e `disposeAutoUpdater` em `main.ts`
- [ ] **C.4.T2** — Após `windowManager.create()`, chamar `setupAutoUpdater(windowManager.getWindow()!)`
- [ ] **C.4.T3** — Em `before-quit`, chamar `disposeAutoUpdater()`

### C.5 — UI no renderer

- [ ] **C.5.T1** — Em `App.tsx`, adicionar estado `updateInfo` e escutar `window.bitWhat.onUpdateReady`
- [ ] **C.5.T2** — Renderizar banner `.update-banner` quando `updateInfo !== null`
- [ ] **C.5.T3** — Botão "Reiniciar agora" chama `window.bitWhat.installUpdate()`
- [ ] **C.5.T4** — Adicionar estilos `.update-banner` em `styles.css` (banner discreto no topo, botão à direita)

### Verificação da Fase C

- [ ] **C.V1** — `npm run typecheck` sem erros
- [ ] **C.V2** — Em dev (`npm run dev`): log "Auto-updater desativado em desenvolvimento"
- [ ] **C.V3** — Em prod (`npm run build:win` + rodar `.exe`): log "verificando updates" 5s após abrir
- [ ] **C.V4** — Commit: `feat(updater): P9 electron-updater with GitHub Releases`

---

## Fase D — CI/CD GitHub Actions (P10)

**Spec:** `docs/spec-10-cicd-github-actions.md` · **Plan detalhado:** `docs/plan-10-cicd-github-actions.md`
**Arquivo novo:** `.github/workflows/build.yml`

### D.1 — Workflow

- [ ] **D.1.T1** — Criar `.github/workflows/build.yml`
- [ ] **D.1.T2** — Triggers: `push` em `main`, `pull_request` em `main`, tags `v*`
- [ ] **D.1.T3** — Job `build` em `windows-latest`
- [ ] **D.1.T4** — Step `actions/checkout@v4` com `fetch-depth: 0`
- [ ] **D.1.T5** — Step `actions/setup-node@v4` com Node 22 e `cache: npm`
- [ ] **D.1.T6** — Step `npm ci` (confirma que `package-lock.json` está atualizado localmente antes)
- [ ] **D.1.T7** — Step `npm run typecheck`
- [ ] **D.1.T8** — Step `npm run build:win` com `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
- [ ] **D.1.T9** — Step (condicional `push main`): `actions/upload-artifact@v4` com `dist/BitWhat-*.exe` e retention 14d
- [ ] **D.1.T10** — Step (condicional `tag v*`): publish release via `npx electron-builder --win nsis --publish always` ou `softprops/action-gh-release@v2`

### D.2 — Validação local do postinstall

- [ ] **D.2.T1** — Rodar `npm ci` localmente em pasta limpa e confirmar que `postinstall` (`npm run icons`) funciona sem dep extra
- [ ] **D.2.T2** — Se `generate-icons.mjs` precisar de `sharp`/canvas, adicionar a `devDependencies` antes do push

### Verificação da Fase D

- [ ] **D.V1** — Commit e push para `main` → workflow dispara
- [ ] **D.V2** — Workflow completa em <10min
- [ ] **D.V3** — Artifact `BitWhat-windows-<sha>` disponível na aba Actions
- [ ] **D.V4** — (Opcional, se_tag fake) Criar `v0.1.1-test` → Release criado no GitHub com `.exe` anexado → depois deletar tag/Release
- [ ] **D.V5** — Commit: `ci: P10 GitHub Actions build + publish`

---

## Fase E — TypeScript strict (P8)

**Spec:** `docs/spec-08-typescript-strict.md` · **Plan detalhado:** `docs/plan-08-typescript-strict.md`
**Por que no fim:** Todas as outras espeficas já foram implementadas. Se P8 introduzir erros, sabemos que são nos arquivos finais e não retrabalho.

### E.1 — Ativar flag por flag

- [ ] **E.1.T1** — Ativar `noUncheckedIndexedAccess: true` em `tsconfig.json`
- [ ] **E.1.T2** — `npm run typecheck` → catalogar erros
- [ ] **E.1.T3** — Corrigir erros (prováveis: `session-manager.ts`, `settings-store.ts`)
- [ ] **E.1.T4** — `npm run typecheck` → zero erros

- [ ] **E.2.T1** — Ativar `noPropertyAccessFromIndexSignature: true`
- [ ] **E.2.T2** — `npm run typecheck` → catalogar erros
- [ ] **E.2.T3** — Corrigir (provável: `settings-store.ts` casts `(input as { ... })`)
- [ ] **E.2.T4** — `npm run typecheck` → zero erros

- [ ] **E.3.T1** — Ativar `exactOptionalPropertyTypes: true`
- [ ] **E.3.T2** — `npm run typecheck` → catalogar erros
- [ ] **E.3.T3** — Corrigir (provável: `WhatsAppStatus.detail?`, props React)
- [ ] **E.3.T4** — `npm run typecheck` → zero erros

### E.4 — Validação final

- [ ] **E.4.T1** — `npm run build` (inclui typecheck) → sucesso
- [ ] **E.4.T2** — `npm run dev` → app abre sem regressão
- [ ] **E.4.T3** — `rg "@ts-ignore|@ts-expect-error" src/` → zero resultados
- [ ] **E.4.V** — Commit: `chore(ts): P8 strict flags — noUncheckedIndexedAccess, noPropertyAccessFromIndexSignature, exactOptionalPropertyTypes`

### Plano de contingência (P8)

Se E.1.T3/E.2.T3/E.3.T3 gerar >30 erros e esforço passar de 2h:
- Manter apenas `noUncheckedIndexedAccess` (E.1) ativo
- Reverter E.2 e E.3 em `tsconfig.json`
- Documentar nas specs que as flags adiadas ficam para sprint seguinte

---

## Verificação final integradora (após Fases A–E)

- [ ] **F1** — `npm run typecheck` → zero erros
- [ ] **F2** — `npm run build:win` → instalador gerado em `dist/BitWhat-0.x.0-Setup.exe`
- [ ] **F3** — Instalar `.exe` em VM ou máquina limpa:
  - App abre
  - Login via QR Code
  - Ícone do tray muda de cor (amarelo → verde)
  - `Ctrl+Shift+W` mostra/oculta
  - `Ctrl+Shift+R` recarrega
  - Modo Mini alterna sem flicker
  - Esconder → CPU <1% no Task Manager
  - Banner de update aparece se houver release mais novo
- [ ] **F4** — Abrir DevTools do renderer (`Ctrl+Shift+I` se applicável):
  - Console sem erros de CSP
  - Network mostra chunks separados (se Spec 12 aplicada)
- [ ] **F5** — Rodar `git log --oneline` → deve mostrar commits de cada fase na ordem:
  1. `feat(window-manager): P1–P5 timeout, shortcuts, tray, throttle resize/background`
  2. `feat(session): P6+P7 cache aggressive + CSP refined`
  3. `feat(updater): P9 electron-updater with GitHub Releases`
  4. `ci: P10 GitHub Actions build + publish`
  5. `chore(ts): P8 strict flags ...`
- [ ] **F6** — (Opcional) Abrir PR para `main` com título `feat: otimização P1–P10 (timeout, shortcuts, tray, throttle, cache, CSP, updater, CI, TS strict)` e descrição linkando para `docs/spec-NN-*.md` + `docs/plan-NN-*.md`

---

## Checklist de regressão

Confirmar que nada quebrou após todas as fases:

| Funcionalidade | Teste | Resultado |
|---------------|-------|-----------|
| App abre | `npm run dev` | ☐ ok |
| Login QR Code | Deslogar e ler QR | ☐ ok |
| Carregamento normal | <25s sem timeout | ☐ ok |
| Timeout + retry | Desligar Wi-Fi → 3 retries → botão "Tentar novamente" | ☐ ok |
| Atalho toggle | `Ctrl+Shift+W` com app focado e minimizado | ☐ ok |
| Atalho reload | `Ctrl+Shift+R` com outro app focado | ☐ ok |
| Tray ícone | Mudança de cor conforme estado | ☐ ok |
| Tray tooltip | Texto dinâmico ao hover | ☐ ok |
| Tray menu | Abrir/Recarregar/Limpar sessão/Sair | ☐ ok |
| Modo Mini | Alternar Padrão ↔ Mini sem flicker | ☐ ok |
| Resize fluido | Arrastar borda 5s CPU <20% | ☐ ok |
| Esconder na bandeja | CPU <1% no Task Manager | ☐ ok |
| Notificação ao oculto | Msg de outro número chega (≤1s delay) | ☐ ok |
| CSP no renderer | Console sem erros de CSP | ☐ ok |
| HMR em dev | Editar `App.tsx` recarrega | ☐ ok |
| Cache estáticos | Network mostra `(disk cache)` ao recarregar | ☐ ok |
| Auto-updater (dev) | Log "desativado em desenvolvimento" | ☐ ok |
| Auto-updater (prod) | Log "verificando updates" 5s após abrir | ☐ ok |
| GitHub Actions | Push em main dispara build | ☐ ok |
| TypeScript strict | `npm run typecheck` sem erros | ☐ ok |

---

## Gestão de branch e commits

Recomendado um branch único com commits por fase:

```bash
git checkout -b feat/optimization-p1-p10

# Fase A
# ... edits ...
git add -A && git commit -m "feat(window-manager): P1–P5 timeout, shortcuts, tray, throttle resize/background"

# Fase B
# ... edits ...
git add -A && git commit -m "feat(session): P6+P7 cache aggressive + CSP refined"

# Fase C
# ... edits ...
git add -A && git commit -m "feat(updater): P9 electron-updater with GitHub Releases"

# Fase D
# ... edits ...
git add -A && git commit -m "ci: P10 GitHub Actions build + publish"

# Fase E
# ... edits ...
git add -A && git commit -m "chore(ts): P8 strict flags — noUncheckedIndexedAccess, noPropertyAccessFromIndexSignature, exactOptionalPropertyTypes"

# Push e PR
git push -u origin feat/optimization-p1-p10
gh pr create --title "feat: otimização P1–P10" --body "Ver docs/spec-NN-*.md e docs/plan-NN-*.md"
```

---

## Tempo estimado por fase

| Fase | Espeficas | Estimativa |
|------|----------|-----------|
| A | P1 + P2 + P3 + P4 + P5 | ~3.5h |
| B | P6 + P7 | ~50min |
| C | P9 | ~2h |
| D | P10 | ~45min |
| E | P8 | ~1h |
| **Total** | **P1–P10** | **~8.5h** |

---

## Notas finais

- **Fase A é a mais densa** — cinco espeficas tocando o mesmo arquivo (`window-manager.ts`). Recomendação: abrir `window-manager.ts` uma única vez e aplicar todas as mudanças juntas para evitar rebasing.
- **Fase B não pode ser splitada** — P6 e P7 compartilham `onHeadersReceived`. Qualquer implementação que tente separá-las vai quebrar uma das duas.
- **Fase E pode ser adiada** se o time preferir validar A–D primeiro e fazer P8 numa RT separada. Mas como P8 não muda runtime, fazer no fim deste branch é seguro.
- **Verificações intermediárias (`.V` tasks)** são gates: não seguir para a próxima tarefa sem passar.
- Commits por fase facilitam revert granular se algo quebrar em produção.
