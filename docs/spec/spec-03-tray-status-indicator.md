# Spec 03 — Indicador visual de estado da sessão no ícone da bandeja

**Prioridade:** P1 — Crítica
**Esforço estimado:** ~1.5h
**Arquivos afetados:** `src/main/services/tray-manager.ts`, `src/main/services/window-manager.ts`, `scripts/generate-icons.mjs`

## Contexto

Hoje o `Tray` usa uma imagem estática (`tray.png` ou `icon.png` como fallback). O usuário não sabe, só de olhar a bandeja, se o WhatsApp está conectado, carregando, aguardando login ou com erro.

## Objetivo

Trocar o ícone da bandeja dinamicamente conforme o estado (`WhatsAppState`) para feedback visual imediato ao usuário.

## Requisitos funcionais

1. **Mapeamento de estado → imagem:**

| Estado | Imagem | Cor de overlay |
|--------|--------|----------------|
| `ready` | `tray.png` | Verde (padrão) |
| `loading` / `initializing` | `tray-loading.png` | Amarelo/laranja |
| `waiting-login` / `session-cleared` | `tray-attention.png` | Azul |
| `connection-error` / `unsupported-browser` | `tray-error.png` | Vermelho |

2. **Tooltip dinâmico:** `BitWhat — Conectado`, `BitWhat — Carregando`, `BitWhat — Aguardando login`, `BitWhat — Erro de conexão`.
3. **Notificação:** `WindowManager.setStatus()` notifica `TrayManager` para atualizar ícone e tooltip.
4. **Fallback:** Se imagem específica não existir, usar `tray.png` (comportamento atual).

## Requisitos não funcionais

- Imagens em PNG com transparência, tamanho 16x16 e 32x32 (suporte a DPI alto).
- `nativeImage.createFromPath` retorna objeto vazio se arquivo não existir — checar com `.isEmpty()`.
- Não regenerar ícones a cada atualização de status — cachear as 4 imagens em `TrayManager`.

## Plano de implementação

### Passo 1 — Gerar 4 PNGs no `scripts/generate-icons.mjs`

Adicionar geração de 4 variantes a partir do `icon.svg` base, aplicando tinta colorida sobreposta:

```js
// generate-icons.mjs — adicionar após geração existente
const statusColors = {
  ready: '#22c55e',        // green-500
  loading: '#f59e0b',       // amber-500
  attention: '#3b82f6',    // blue-500
  error: '#ef4444'         // red-500
}

// Para cada cor, gerar tray-${status}.png com overlay circular no canto
```

Usar `sharp` (se disponível) ou canvas puro via `@napi-rs/canvas`. Se não houver dependência, gerar manualmente com arquivo SVG por cor + conversão.

Alternativa simples: criar 4 SVGs com cor de fundo diferente e converter para PNG.

Arquivos a gerar em `build/`:
- `tray.png` (existente, verde)
- `tray-loading.png` (amarelo)
- `tray-attention.png` (azul)
- `tray-error.png` (vermelho)

### Passo 2 — Cache de imagens no `TrayManager`

```ts
// tray-manager.ts — novos campos
private images: Record<WhatsAppState, NativeImage> = {} as Record<WhatsAppState, NativeImage>
private statusToImageKey: Record<WhatsAppState, string> = {
  ready: 'tray.png',
  loading: 'tray-loading.png',
  initializing: 'tray-loading.png',
  'waiting-login': 'tray-attention.png',
  'session-cleared': 'tray-attention.png',
  'connection-error': 'tray-error.png',
  'unsupported-browser': 'tray-error.png'
}
private statusToTooltip: Record<WhatsAppState, string> = {
  ready: 'BitWhat — Conectado',
  loading: 'BitWhat — Carregando',
  initializing: 'BitWhat — Iniciando',
  'waiting-login': 'BitWhat — Aguardando login',
  'session-cleared': 'BitWhat — Sessão limpa',
  'connection-error': 'BitWhat — Erro de conexão',
  'unsupported-browser': 'BitWhat — Navegador recusado'
}
```

### Passo 3 — Pré-carregar imagens em `create()`

```ts
create(): void {
  this.preloadImages()
  this.tray = new Tray(this.getImage('ready'))
  this.tray.setToolTip('BitWhat')
  this.tray.on('click', () => this.windowManager.toggle())
  this.refreshMenu()
  logger.info('Ícone da bandeja criado')
}

private preloadImages(): void {
  for (const state of Object.keys(this.statusToImageKey) as WhatsAppState[]) {
    const fileName = this.statusToImageKey[state]
    const fullPath = getTrayImagePath(fileName)
    const image = nativeImage.createFromPath(fullPath)
    if (!image.isEmpty()) {
      this.images[state] = image
    }
  }
}

private getImage(state: WhatsAppState): NativeImage {
  return this.images[state] ?? this.images.ready ?? nativeImage.createEmpty()
}
```

### Passo 4 — Método público `updateStatus(state: WhatsAppState)`

```ts
updateStatus(state: WhatsAppState): void {
  if (!this.tray) {
    return
  }

  const image = this.getImage(state)
  if (!image.isEmpty()) {
    this.tray.setImage(image)
  }
  this.tray.setToolTip(this.statusToTooltip[state] ?? 'BitWhat')
}
```

### Passo 5 — `WindowManager.setStatus()` notifica `TrayManager`

`WindowManager` precisa de referência ao `TrayManager`. Hoje não tem. Duas opções:

**Opção A:** Passar `TrayManager` para `WindowManager` no construtor (injeção de dependência).

**Opção B:** Usar EventEmitter / callback. `WindowManager` expõe `onStatusChange(cb)` e `main.ts` conecta.

Recomendado: **Opção A** (mais simples, já que ambos vivem em `main.ts`).

Em `main.ts:31-35`:

```ts
windowManager = new WindowManager(settingsStore, sessionManager)
const trayManager = new TrayManager(windowManager, sessionManager)
trayManager.create()
windowManager.setTrayManager(trayManager)  // novo
```

Em `window-manager.ts`:

```ts
private trayManager?: TrayManager

setTrayManager(trayManager: TrayManager): void {
  this.trayManager = trayManager
}

private setStatus(status: WhatsAppStatus): void {
  this.status = status
  this.mainWindow?.webContents.send(IPC.statusChanged, status)
  this.trayManager?.updateStatus(status.state)
}
```

Importar `WhatsAppState` de `types.ts` se ainda não importado.

### Passo 6 — Ajustar `assets.ts`

Adicionar helper `getTrayImagePath(fileName)`:

```ts
export function getTrayImagePath(fileName: string): string {
  return getAssetPath(fileName)
}
```

Ou reusar `getAssetPath` direto — `tray-manager.ts` já usa `getTrayImage()`.

## Verificação

- [ ] App abrindo fresh → ícone amarelo (loading) → verde (ready).
- [ ] Deslogar do WhatsApp → ícone azul (waiting-login).
- [ ] Desligar internet → ícone vermelho (connection-error).
- [ ] Tooltip muda conforme estado ao passar mouse.
- [ ] Se `tray-loading.png` não existir, fallback para `tray.png` sem erro.
- [ ] `npm run typecheck` sem erros.
- [ ] `npm run icons` gera os 4 PNGs.

## Riscos

- Gerar PNGs com overlay colorido pode exigir dep adicional (sharp/canvas). Avaliar: se complexo, usar 4 SVGs estáticos no `build/` e converter com `electron-builder` no build. Como alternativa mínima, gerar 4 PNGs manualmente uma vez e comitá-los.
- `nativeImage` em Windows espera ICO às vezes — testar se PNG transparente funciona na bandeja (deveria, Electron suporta PNG no tray no Windows).
