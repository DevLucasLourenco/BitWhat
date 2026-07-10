# Spec 01 — Timeout + retry automático no carregamento do WhatsApp

**Prioridade:** P1 — Crítica
**Esforço estimado:** ~1h
**Arquivos afetados:** `src/main/services/window-manager.ts`, `src/shared/types.ts`, `src/renderer/src/App.tsx`

## Contexto

Hoje, se o WhatsApp Web não carregar (rede lenta, servidor fora, DNS falho), o app fica em estado `loading` indefinidamente sem feedback ao usuário. Não há retry automático nem botão visível para tentar novamente.

## Objetivo

Detectar falha de carregamento em tempo razoável, tentar recarregar automaticamente e, se persistir, oferecer ação manual clara ao usuário.

## Requisitos funcionais

1. **Timeout de carregamento:** 25 segundos após `loadURL(WHATSAPP_URL)`, se `status.state` ainda for `loading` ou `initializing`, disparar reload automático.
2. **Contador de tentativas:** Máximo de **3 tentativas automáticas** consecutivas. Após a 3ª falha, parar e mostrar estado `connection-error` com detalhe "Verifique sua conexão e tente novamente."
3. **Reset do contador:** Quando `dom-ready` ou `did-finish-load` atingir `ready`, zerar `reloadAttempts`.
4. **Botão "Tentar novamente" no renderer:** Quando `state === 'connection-error'`, o `status.detail` deve incluir a ação e o renderer deve mostrar um botão visível que chama `window.bitWhat.reloadWhatsapp()`.
5. **Não interferir com detecção existente:** A lógica de `detectWhatsAppState()` (QR Code, chat list, unsupported browser) já funciona. O timeout só atua quando o carregamento nunca termina.

## Requisitos não funcionais

- O timer deve ser cancelado ao trocar de URL manualmente (reload do usuário) para não disparar falso-positivo.
- Logging de cada tentativa via `logger.warn` com número da tentativa.
- O timeout não se aplica quando `did-fail-load` já tratou o erro (errorCode !== -3, isMainFrame) — esse caminho já mostra `connection-error`.

## Plano de implementação

### Passo 1 — Adicionar contador e timer no `WindowManager`

```ts
// window-manager.ts — novos campos privados
private reloadAttempts = 0
private loadTimeoutTimer?: NodeJS.Timeout
private readonly MAX_RELOAD_ATTEMPTS = 3
private readonly LOAD_TIMEOUT_MS = 25_000
```

### Passo 2 — Método `scheduleLoadTimeout()`

Chamado ao final de `loadWhatsApp()` e `reloadWhatsApp()`:

```ts
private scheduleLoadTimeout(): void {
  this.clearLoadTimeout()
  this.loadTimeoutTimer = setTimeout(() => {
    this.handleLoadTimeout()
  }, this.LOAD_TIMEOUT_MS)
}

private clearLoadTimeout(): void {
  if (this.loadTimeoutTimer) {
    clearTimeout(this.loadTimeoutTimer)
    this.loadTimeoutTimer = undefined
  }
}

private handleLoadTimeout(): void {
  if (this.status.state === 'ready' || this.status.state === 'waiting-login') {
    return
  }

  this.reloadAttempts += 1
  logger.warn(`Timeout de carregamento. Tentativa ${this.reloadAttempts}/${this.MAX_RELOAD_ATTEMPTS}`)

  if (this.reloadAttempts >= this.MAX_RELOAD_ATTEMPTS) {
    this.setStatus(
      this.createStatus(
        'connection-error',
        'Erro de conexão',
        'Não foi possível carregar o WhatsApp Web após várias tentativas. Verifique sua conexão.'
      )
    )
    return
  }

  this.reloadWhatsApp()
}
```

### Passo 3 — Resetar contador em `dom-ready` / `did-finish-load`

Em `bindWhatsAppEvents()`, dentro dos handlers `dom-ready` e `did-finish-load`, após `detectWhatsAppState()`:

```ts
this.clearLoadTimeout()
if (this.status.state === 'ready' || this.status.state === 'waiting-login') {
  this.reloadAttempts = 0
}
```

### Passo 4 — Chamar `scheduleLoadTimeout()` nos pontos de carga

- `loadWhatsApp()` (linha ~342): adicionar `this.scheduleLoadTimeout()` ao final.
- `reloadWhatsApp()` (linha ~139): adicionar `this.scheduleLoadTimeout()` ao final.
- Limpar timeout em `did-fail-load` antes de mostrar `connection-error`.

### Passo 5 — Renderer: botão "Tentar novamente"

Em `App.tsx`, quando `status.state === 'connection-error'`, renderizar botão:

```tsx
{status.state === 'connection-error' && (
  <button className="text-button" type="button" onClick={reloadWhatsApp} disabled={busyAction !== null}>
    <RefreshCw size={16} />
    Tentar novamente
  </button>
)}
```

### Passo 6 — Expor `reloadAttempts` (opcional)

Adicionar campo `reloadAttempts?: number` em `WhatsAppStatus` (`types.ts`) se quisermos mostrar "Tentativa 2 de 3" no detail. Avaliar se vale a pena poluir a interface.

## Verificação

- [ ] Desligar Wi-Fi, abrir app → deve tentar 3x e mostrar erro com botão.
- [ ] Ligar Wi-Fi durante tentativas → deve carregar normalmente e zerar contador.
- [ ] Reload manual (F5) durante timeout → não deve disparar erro falso.
- [ ] `npm run typecheck` sem erros.

## Riscos

- WhatsApp Web legítimo pode demorar >25s em rede muito lenta →retry dispara desnecessariamente. Mitigação: 25s é generoso; 3 tentativas dão 75s de janela total.
- Se `detectWhatsAppState` marcar `ready` cedo (falso positivo), o timeout reseta corretamente.
