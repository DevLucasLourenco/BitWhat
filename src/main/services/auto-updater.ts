import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC } from '../../shared/ipc'
import { logger } from './logger'

// Atualizações vêm das Releases do GitHub (publicadas com `npm run release`).
// Checa ao abrir o app e a cada 6 h; baixa em segundo plano e instala ao sair
// ou pelo botão "Reiniciar agora".
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const INITIAL_DELAY_MS = 5_000

let checkInterval: NodeJS.Timeout | undefined

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
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
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: `BitWhat ${info.version} pronto para instalar`,
        body: 'A atualização será instalada ao sair do BitWhat. Clique para abrir e reiniciar agora.',
        silent: true
      })
      notification.on('click', () => {
        mainWindow.show()
        mainWindow.focus()
      })
      notification.show()
    }
  })

  autoUpdater.on('error', (error) => {
    logger.error('Auto-updater: erro', error)
  })

  // Erros (ex.: offline) chegam pelo evento 'error'; o catch só evita rejeição solta.
  const check = (): void => {
    autoUpdater.checkForUpdates().catch(() => undefined)
  }

  setTimeout(() => {
    check()
    checkInterval = setInterval(check, CHECK_INTERVAL_MS)
  }, INITIAL_DELAY_MS)

  ipcMain.handle(IPC.installUpdate, () => {
    autoUpdater.quitAndInstall()
  })

  logger.info('Auto-updater inicializado')
}

export function disposeAutoUpdater(): void {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = undefined
  }
}
