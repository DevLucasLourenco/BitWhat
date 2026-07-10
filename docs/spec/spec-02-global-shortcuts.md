# Spec 02 — Atalhos globais de teclado (`globalShortcut`)

**Prioridade:** P1 — Crítica
**Esforço estimado:** ~45min
**Arquivos afetados:** `src/main/services/window-manager.ts`

## Contexto

Hoje não há atalhos globais. O usuário precisa clicar no ícone da bandeja para mostrar/ocultar a janela ou usar F5 dentro do app para recarregar. Atalhos globais permitem operar o BitWhat mesmo com outra aplicação focada.

## Objetivo

Registrar atalhos globais que funcionem mesmo quando o BitWhat está minimizado na bandeja ou outra aplicação está focada.

## Requisitos funcionais

1. **`Ctrl+Shift+W`** — Toggle mostrar/ocultar janela. Se visível e focada → hide; senão → show.
2. **`Ctrl+Shift+R`** — Recarregar WhatsApp Web (mesma ação de `reloadWhatsApp()`).
3. Registros só ativos enquanto o app está rodando (entre `whenReady` e `before-quit`).
4. Se o atalho já estiver registrado por outro app, logar warning e não quebrar.
5. Desregistrar todos os atalhos no `before-quit` para liberar teclas no sistema.

## Requisitos não funcionais

- Usar `globalShortcut.register` do Electron.
- Não usar `Menu.setApplicationMenu` para atalhos (não são globais).
- Validar com `globalShortcut.isRegistered(nome)` antes de registrar para evitar duplicação.
- Em caso de falha no registro, logar `logger.warn` com nome do atalho — não lançar erro.

## Plano de implementação

### Passo 1 — Importar `globalShortcut` em `window-manager.ts`

```ts
import {
  app,
  BrowserView,
  BrowserWindow,
  globalShortcut,
  Menu,
  screen
} from 'electron'
```

### Passo 2 — Constantes de atalhos

```ts
const SHORTCUT_TOGGLE_WINDOW = 'CommandOrControl+Shift+W'
const SHORTCOT_RELOAD_WHATSAPP = 'CommandOrControl+Shift+R'
```

### Passo 3 — Métodos `registerGlobalShortcuts()` e `unregisterGlobalShortcuts()`

```ts
private registerGlobalShortcuts(): void {
  const registered = globalShortcut.register(SHORTCUT_TOGGLE_WINDOW, () => {
    this.toggle()
  })

  if (!registered) {
    logger.warn(`Falha ao registrar atalho global: ${SHORTCUT_TOGGLE_WINDOW}`)
  }

  const reloadRegistered = globalShortcut.register(SHORTCOT_RELOAD_WHATSAPP, () => {
    this.reloadWhatsApp()
  })

  if (!reloadRegistered) {
    logger.warn(`Falha ao registrar atalho global: ${SHORTCOT_RELOAD_WHATSAPP}`)
  }

  logger.info('Atalhos globais registrados')
}

private unregisterGlobalShortcuts(): void {
  globalShortcut.unregister(SHORTCUT_TOGGLE_WINDOW)
  globalShortcut.unregister(SHORTCOT_RELOAD_WHATSAPP)
  globalShortcut.unregisterAll()
  logger.info('Atalhos globais removidos')
}
```

### Passo 4 — Chamar em `create()` e `quit()`

Em `create()`, após `this.mainWindow.once('ready-to-show', ...)`:

```ts
this.registerGlobalShortcuts()
```

Em `quit()` (linha ~194):

```ts
quit(): void {
  this.unregisterGlobalShortcuts()
  this.isQuitting = true
  app.quit()
}
```

### Passo 5 — Desregistrar em `before-quit` (defesa)

Em `main.ts:43-45`, o handler `before-quit` já chama `windowManager?.setQuitting(true)`. Adicionar também:

```ts
app.on('before-quit', () => {
  windowManager?.setQuitting(true)
  windowManager?.unregisterGlobalShortcuts?.()
})
```

Como `unregisterGlobalShortcuts` é privado, expor wrapper público `disposeGlobalShortcuts()` ou tornar público. Alternativa: chamar `globalShortcut.unregisterAll()` direto em `main.ts`.

## Verificação

- [ ] App minimizado na bandeja → `Ctrl+Shift+W` mostra janela.
- [ ] Janela visível e focada → `Ctrl+Shift+W` oculta.
- [ ] `Ctrl+Shift+R` recarrega WhatsApp mesmo com outro app focado.
- [ ] Fechar app via "Sair" → atalhos liberados (testar abrindo outro app que use as mesmas teclas).
- [ ] `npm run typecheck` sem erros.

## Riscos

- Conflito com outro app que já usa `Ctrl+Shift+W` (ex: VS Code não usa essa combinação por padrão, mas browsers podem). Mitigação: warning no log, não quebra o app.
- Em ambientes corporativos com policies de teclado, atalhos globais podem ser bloqueados. Mitigação: falha silenciosa com log.
