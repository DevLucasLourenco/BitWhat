# Spec 09 — Auto-updater (`electron-updater`)

**Prioridade:** P3 — Média
**Esforço estimado:** ~2h
**Arquivos afetados:** `package.json`, `electron-builder.yml`, `src/main/main.ts`, `src/main/ipc.ts`, `src/main/services/auto-updater.ts` (novo), `src/shared/ipc.ts`, `src/shared/api.ts`, `src/preload/preload.ts`, `src/renderer/src/App.tsx`

## Contexto

Hoje, novas versões do BitWhat exigem reinstalação manual do `.exe`. Não há checagem de updates. App desktop sem auto-update perde adoção — usuários ficam em versões velhas com bugs.

## Objetivo

Verificar updates ao iniciar e a cada 6h. Baixar em background. Notificar renderer quando update pronto. Instalar no próximo quit.

## Requisitos funcionais

1. **Checagem na inicialização:** 5s após `app.whenReady`, chamar `autoUpdater.checkForUpdatesAndNotify()`.
2. **Checagem periódica:** A cada 6h, re-checkar.
3. **Download em background:** Não interromper uso.
4. **Notificação ao renderer:** Quando update baixado, enviar IPC `app:update-ready` com `version`.
5. **Instalar no quit:** Usuário escolhe instalar ao fechar (próximo startup).
6. **Desativar em dev:** `app.isPackaged === false` → não checar (sem servidor de updates em dev).
7. **Logs:** `logger.info` em cada etapa (checking, available, not-available, downloading, downloaded, error).

## Requisitos não funcionais

- Usar `electron-updater` v6+ (compatível com Electron 42).
- Provider GitHub Releases OU servidor estático próprio (definir em `electron-builder.yml`).
- Não quebrar se estiver offline — `autoUpdater` falha silenciosamente.
- Code signature: GitHub Releases funciona sem assinatura de código, mas Windows pode warns de SmartScreen. Fora do escopo desta spec.

## Plano de implementação

### Passo 1 — Instalar `electron-updater`

```bash
npm install electron-updater@^6
```

### Passo 2 — Configurar `electron-builder.yml`

Adicionar provider de publish. Opção A: GitHub Releases (mais simples).

```yaml
# electron-builder.yml — adicionar no final
publish:
  provider: github
  owner: <org-ou-usuario-github>
  repo: bitwhat
  releaseType: release
```

Opção B: servidor estático próprio (S3, nginx):

```yaml
publish:
  provider: generic
  url: https://updates.bitwhat.com/v1/
```

Definir qual antes de implementar.

### Passo 3 — Criar `src/main/services/auto-updater.ts`

```ts
import { autoUpdater } from 'electron-updater'
import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc'
import { logger } from './logger'

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000  // 6h
const INITIAL_DELAY_MS = 5_000

let checkInterval: NodeJS.Timeout | undefined

export function setupAutoUpdater(mainWindow: electron.BrowserWindow): void {
  if (!app.isPackaged) {
    logger.info('Auto-updater desativado em desenvolvimento')
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    logger.info('Auto-updater: verificando updates')
  })

  autoUpdater.on('update-available', (info) => {
    logger.info(`Auto-updater: update disponível v${info.version}`)
  })

  autoUpdater.on('update-not-available', () => {
    logger.info('Auto-updater: app atualizado')
  })

  autoUpdater.on('download-progress', (progress) => {
    logger.info(`Auto-updater: download ${progress.percent.toFixed(1)}%`)
  })

  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`Auto-updater: update v${info.version} baixado`)
    mainWindow.webContents.send(IPC.updateReady, { version: info.version })
  })

  autoUpdater.on('error', (error) => {
    logger.error('Auto-updater: erro', error)
  })

  setTimeout(() => {
    void autoUpdater.checkForUpdatesAndNotify()

    checkInterval = setInterval(() => {
      void autoUpdater.checkForUpdatesAndNotify()
    }, CHECK_INTERVAL_MS)
  }, INITIAL_DELAY_MS)

  logger.info('Auto-updater inicializado')
}

export function disposeAutoUpdater(): void {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = undefined
  }
}

// IPC para instalar agora (opcional)
ipcMain.handle(IPC.installUpdate, () => {
  autoUpdater.quitAndInstall()
})
```

### Passo 4 — Adicionar canais IPC

`src/shared/ipc.ts`:

```ts
export const IPC = {
  // ... existentes ...
  updateReady: 'app:update-ready',
  installUpdate: 'app:install-update'
} as const
```

### Passo 5 — Expor no preload

`src/preload/preload.ts`:

```ts
const api: BitWhatApi = {
  // ... existentes ...
  onUpdateReady: (callback: (info: { version: string }) => void) => {
    const listener = (_event: IpcRendererEvent, info: { version: string }): void => callback(info)
    ipcRenderer.on(IPC.updateReady, listener)
    return () => ipcRenderer.removeListener(IPC.updateReady, listener)
  },
  installUpdate: () => ipcRenderer.invoke(IPC.installUpdate)
}
```

Atualizar `BitWhatApi` em `src/shared/api.ts`:

```ts
export interface BitWhatApi {
  // ... existentes ...
  onUpdateReady: (callback: (info: { version: string }) => void) => () => void
  installUpdate: () => Promise<void>
}
```

### Passo 6 — UI no renderer

`src/renderer/src/App.tsx`:

```tsx
const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null)

useEffect(() => {
  const off = window.bitWhat.onUpdateReady(setUpdateInfo)
  return off
}, [])

// Renderizar banner quando updateInfo !== null
{updateInfo && (
  <div className="update-banner">
    Nova versão {updateInfo.version} disponível. Reinicie para instalar.
    <button onClick={() => window.bitWhat.installUpdate()}>Reiniciar agora</button>
  </div>
)}
```

CSS em `styles.css` (não detalhado aqui — padrão de banner discrete no topo).

### Passo 7 — Inicializar em `main.ts`

```ts
import { setupAutoUpdater, disposeAutoUpdater } from './services/auto-updater'

// ... em app.whenReady().then(async () => { ...
await windowManager.create(shouldStartHidden)

if (windowManager.getWindow()) {
  setupAutoUpdater(windowManager.getWindow()!)
}

// ...

app.on('before-quit', () => {
  disposeAutoUpdater()
})
```

### Passo 8 — Workflow de release

Para publicar update:
```bash
# 1. Bump versão em package.json
npm version patch  # ou minor/major

# 2. Build + publish
npm run build:win -- --publish always
```

Requer `GH_TOKEN` (GitHub PAT) no env se usando GitHub Releases.

## Verificação

- [ ] Em dev: `setupAutoUpdater` loga "desativado em desenvolvimento".
- [ ] Em prod (build empacotado): loga "verificando updates" 5s após abrir.
- [ ] Se houver release mais novo no GitHub/server: loga "update disponível" + "download X%".
- [ ] Ao finalizar download: renderer mostra banner "Nova versão X".
- [ ] Clicar "Reiniciar agora" → app instala e reinicia.
- [ ] Fechar app normalmente → instala no próximo startup.
- [ ] Offline: loga erro e não quebra app.
- [ ] `npm run typecheck` sem erros.

## Riscos

- **SmartScreen no Windows:** Builds sem assinatura de código disparam SmartScreen. Mitigação: fora do escopo. Updater ainda funciona, apenas warning inicial.
- **Quebrar app se update corrupto:** `electron-updater` verifica hash antes de instalar. Seguro.
- **Rate limit GitHub Releases:** Para app com poucos usuários (cenário atual), não há problema. Se escalar para milhares, usar `generic` provider com CDN próprio.
- **Publicar token no .yml:** NUNCA commit `GH_TOKEN` no repo. Passar via env var no CI (Spec 10).

## Dependências

- Esta spec beneficia muito da Spec 10 (CI/CD) para automatizar publicação de releases no GitHub a cada tag.
