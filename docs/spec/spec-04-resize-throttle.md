# Spec 04 — Throttle no resize da janela (RAF + debounce)

**Prioridade:** P2 — Alta
**Esforço estimado:** ~30min
**Arquivos afetados:** `src/main/services/window-manager.ts`

## Contexto

Em `window-manager.ts:250-253`, o handler `resize` chama `updateWhatsAppBounds()` + `scheduleBoundsSave()` a cada pixel de resize. Em monitores 4K ou ao redimensionar com mouse, isso dispara dezenas de vezes por segundo, causando repaint excessivo do `BrowserView` do WhatsApp Web.

## Objetivo

Agrupar chamadas de resize/move num único ciclo de `requestAnimationFrame` para reduzir repaints e CPU.

## Requisitos funcionais

1. `updateWhatsAppBounds()` só deve ser chamada uma vez por frame (~16ms).
2. `scheduleBoundsSave()` já tem debounce de 350ms — manter.
3. Transições de modo Mini ↔ Padrão não devem ser throttled (exige resize imediato).
4. Comportamento visual idêntico ao atual para o usuário.

## Requisitos não funcionais

- Usar `requestAnimationFrame` nativo do Node.js (disponível em Electron main process via `globalThis.requestAnimationFrame` desde Electron 28+).
- Se RAF não disponível, fallback para `setTimeout(…, 16)`.
- Cancelar RAF pendente ao destruir janela.

## Plano de implementação

### Passo 1 — Novos campos no `WindowManager`

```ts
private resizeRafId?: number
private readonly rafScheduler: (cb: () => void) => number =
  typeof globalThis.requestAnimationFrame === 'function'
    ? globalThis.requestAnimationFrame
    : (cb) => setTimeout(cb, 16)
private readonly rafCanceler: (id: number) => void =
  typeof globalThis.cancelAnimationFrame === 'function'
    ? globalThis.cancelAnimationFrame
    : (id) => clearTimeout(id)
```

### Passo 2 — Refatorar handler `resize` e `move`

Atual (`window-manager.ts:250-255`):

```ts
this.mainWindow.on('resize', () => {
  this.updateWhatsAppBounds()
  this.scheduleBoundsSave()
})

this.mainWindow.on('move', () => this.scheduleBoundsSave())
```

Novo:

```ts
this.mainWindow.on('resize', () => {
  this.scheduleResizeUpdate()
})

this.mainWindow.on('move', () => {
  this.scheduleBoundsSave()
})
```

### Passo 3 — Método `scheduleResizeUpdate()`

```ts
private scheduleResizeUpdate(): void {
  if (this.resizeRafId !== undefined) {
    return
  }

  this.resizeRafId = this.rafScheduler(() => {
    this.resizeRafId = undefined
    this.updateWhatsAppBounds()
    this.scheduleBoundsSave()
  })
}
```

### Passo 4 — Cancelar RAF em `closed` e `quit`

Em `bindWindowEvents()`, handler `closed` (linha ~257):

```ts
this.mainWindow.on('closed', () => {
  if (this.resizeRafId !== undefined) {
    this.rafCanceler(this.resizeRafId)
    this.resizeRafId = undefined
  }
  this.mainWindow = undefined
  this.whatsappView = undefined
})
```

### Passo 5 — Modo Mini não throttle

`applyPanelWindowMode()` (linha ~506) chama `setContentSize` e `ensureVisibleOnDisplay`. Esse caminho dispara `resize` internamente, que agora é throttled. Para garantir transição instantânea, chamar `updateWhatsAppBounds()` sincronicamente após `setContentSize`:

```ts
private applyPanelWindowMode(panel: WhatsAppPanelMode): void {
  if (!this.mainWindow) {
    return
  }

  if (panel === 'mini-chat') {
    // ... código existente ...
    this.mainWindow.setContentSize(MINI_WINDOW_WIDTH, minimum.height, true)
    this.updateWhatsAppBounds()  // síncrono, não throttled
    this.ensureVisibleOnDisplay()
    return
  }

  // ... código existente de saída do mini ...
  this.mainWindow.setBounds(...)
  this.updateWhatsAppBounds()  // síncrono
  this.ensureVisibleOnDisplay()
}
```

## Verificação

- [ ] Redimensionar janela com mouse por 5s → CPU no main process não passa de ~20% (antes podia chegar a 60%+).
- [ ] Alternar Padrão ↔ Mini → janela ajusta instantaneamente, sem delay visível.
- [ ] Mover janela → bounds salvas após 350ms (comportamento atual).
- [ ] Fechar app → nenhum erro de "RAF after destroy".
- [ ] `npm run typecheck` sem erros.

## Riscos

- `requestAnimationFrame` no main process do Electron é non-standard em versões antigas. Confirmar versão: `package.json` tem `electron: ^42.2.0` — a partir de 28+ o RAF está disponível. Mitigação: fallback para `setTimeout(…, 16)` via `rafScheduler`.
- Se `updateWhatsAppBounds` tiver efeito colateral visível (flicker), reduzir intervalo do RAF ou chamar síncrono em movimento brusco.
