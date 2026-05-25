import { app } from 'electron'
import { APP_ID } from '../shared/types'
import { applyLoginItemSettings, registerIpc } from './ipc'
import { logger } from './services/logger'
import { SessionManager } from './services/session-manager'
import { SettingsStore } from './services/settings-store'
import { TrayManager } from './services/tray-manager'
import { WindowManager } from './services/window-manager'

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  let windowManager: WindowManager | undefined

  app.on('second-instance', () => {
    windowManager?.show()
  })

  app.whenReady().then(async () => {
    app.setAppUserModelId(APP_ID)

    const settingsStore = new SettingsStore()
    const sessionManager = new SessionManager()
    sessionManager.configure()

    const preferences = settingsStore.getPreferences()
    applyLoginItemSettings(preferences)

    windowManager = new WindowManager(settingsStore, sessionManager)
    registerIpc({ windowManager, sessionManager, settingsStore })

    const trayManager = new TrayManager(windowManager, sessionManager)
    trayManager.create()

    const shouldStartHidden = process.argv.includes('--hidden') || preferences.startMinimized
    await windowManager.create(shouldStartHidden)

    logger.info('Aplicação pronta')
  })

  app.on('before-quit', () => {
    windowManager?.setQuitting(true)
  })

  app.on('activate', () => {
    windowManager?.show()
  })

  app.on('window-all-closed', () => {
    // Mantem o app vivo na bandeja ate o usuario escolher "Sair".
  })
}
