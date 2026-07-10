# Spec 05 — Limitar FPS/CPU quando minimizado na bandeja

**Prioridade:** P2 — Alta
**Esforço estimado:** ~45min
**Arquivos afetados:** `src/main/services/window-manager.ts`, `src/main/services/session-manager.ts`

## Contexto

Quando o BitWhat está minimizado na bandeja, o `BrowserView` do WhatsApp Web continua rodando timers, animações e listeners de rede como se a janela estivesse visível. Isso consome CPU/GPU e bateria desnecessariamente em laptops.

## Objetivo

Reduzir atividade de render do WhatsApp Web quando a janela está oculta, restaurando performance total ao mostrar.

## Requisitos funcionais

1. Quando `mainWindow.hide()` for chamado, ativar `setBackgroundThrottling(true)` no `webContents` do WhatsApp.
2. Quando `mainWindow.show()` for chamado, restaurar `setBackgroundThrottling(false)` (comportamento normal).
3. Aplicar igualmente ao `mainWindow.webContents` (renderer do React) — já é leve, mas consistentência.
4. Não interferir com notificações do WhatsApp (WhatsApp Web usa timers para polling de msgs — verificar se throttling não atrasa notificações).

## Requisitos não funcionais

- `webContents.setBackgroundThrottling(boolean)` é API estável do Electron desde v22.
- Em Windows 10/11, o throttle reduz timer resolution para 1s quando invisível — suficiente para economia.
- Logging de estado para diagnóstico: `logger.info('WhatsApp background throttling: enabled/disabled')`.

## Plano de implementação

### Passo 1 — `window-manager.ts`: aplicar em `hide()`

Atual (`window-manager.ts:122-124`):

```ts
hide(): void {
  this.mainWindow?.hide()
}
```

Novo:

```ts
hide(): void {
  if (!this.mainWindow) {
    return
  }

  this.mainWindow.hide()
  this.setBackgroundThrottling(true)
}
```

### Passo 2 — `window-manager.ts`: restaurar em `show()`

Atual (`window-manager.ts:112-120`):

```ts
show(): void {
  if (!this.mainWindow) {
    return
  }

  this.ensureVisibleOnDisplay()
  this.mainWindow.show()
  this.mainWindow.focus()
}
```

Novo:

```ts
show(): void {
  if (!this.mainWindow) {
    return
  }

  this.setBackgroundThrottling(false)
  this.ensureVisibleOnDisplay()
  this.mainWindow.show()
  this.mainWindow.focus()
}
```

### Passo 3 — Método `setBackgroundThrottling()`

```ts
private setBackgroundThrottling(enabled: boolean): void {
  try {
    this.whatsappView?.webContents.setBackgroundThrottling(enabled)
    this.mainWindow?.webContents.setBackgroundThrottling(enabled)
    logger.info(`Background throttling ${enabled ? 'ativado' : 'desativado'}`)
  } catch (error) {
    logger.warn('Falha ao ajustar background throttling', error)
  }
}
```

### Passo 4 — Estado inicial

Em `create()`, após `createWhatsappView()`:

```ts
this.setBackgroundThrottling(false)
```

Garantir estado explícito desde o início (default do Electron é `true`, queremos `false` enquanto visível).

### Passo 5 — Quando recarregar WhatsApp

Em `reloadWhatsApp()` (linha ~139), o `BrowserView` pode ser recriado? Não — apenas recarrega URL. Mas em `did-start-loading` (linha ~269), garantir que throttling volte a `false` se janela visível:

```ts
webContents.on('did-start-loading', () => {
  this.panelCssKey = undefined
  this.themeCssKey = undefined
  this.setStatus(this.createStatus('loading', 'Carregando WhatsApp Web'))

  if (this.mainWindow?.isVisible()) {
    this.whatsappView?.webContents.setBackgroundThrottling(false)
  }
})
```

### Passo 6 — Verificar notificações não impactadas

WhatsApp Web usa WebSocket + timers para receber mensagens. `setBackgroundThrottling(true)` pode adiar timers mas não fecha WebSocket. Resultado: notificações chegam, mas possível delay de ~1s para atualizar UI.

Avaliar: se impacto em notificações for inaceitável, usar `setBackgroundThrottling(true)` só para `mainWindow.webContents` (renderer React) e não para `whatsappView`.

## Verificação

- [ ] Esconder app → abrir Task Manager → CPU do BitWhat cai para <1%.
- [ ] Mostrar app → CPU volta ao normal, WhatsApp atualiza msgs pendentes.
- [ ] Esconder com mensagem chegando → notificação ainda aparece (pode ter até 1s de delay).
- [ ] Recarregar WhatsApp enquanto escondido → não trava, carrega em background.
- [ ] `npm run typecheck` sem erros.

## Riscos

- **Notificações atrasadas:** WhatsApp Web pode reagir a mensagens com delay de ~1s quando throttled. Testar com mensagem de outro número enquanto app oculto. Se problema, limitar throttle apenas ao `mainWindow.webContents` (renderer leve) e manter `whatsappView` sem throttle.
- **Animações congeladas:** Tab de volta ao app pode mostrar "frames encolhidos" — aceitável, não é problema visual crítico.
- **Em macOS** o throttle é mais agressivo, mas nosso alvo é Windows.
