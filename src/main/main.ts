import { app } from 'electron'
import { APP_ID } from '../shared/types'
import { disposeAutoUpdater, setupAutoUpdater } from './services/auto-updater'
import { applyLoginItemSettings, registerIpc } from './ipc'
import { logger } from './services/logger'
import { SessionManager } from './services/session-manager'
import { SettingsStore } from './services/settings-store'
import { applyNativeTheme } from './services/theme-manager'
import { AppLock } from './services/app-lock'
import { BubbleManager } from './services/bubble-manager'
import { TrayManager } from './services/tray-manager'
import { WindowManager } from './services/window-manager'

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (app.isPackaged) {
  app.commandLine.appendSwitch('js-flags', '--expose-gc')
}

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  let windowManager: WindowManager | undefined
  let appLock: AppLock | undefined

  app.on('second-instance', () => {
    windowManager?.show()
  })

  app.whenReady().then(async () => {
    app.setAppUserModelId(APP_ID)

    const settingsStore = new SettingsStore()
    const sessionManager = new SessionManager()
    sessionManager.configure()

    const preferences = settingsStore.getPreferences()
    applyNativeTheme(preferences.theme)
    applyLoginItemSettings(preferences)

    // Antes da janela: se a senha pede bloqueio ao abrir, o WhatsApp nunca aparece.
    appLock = new AppLock(settingsStore)
    appLock.start()

    windowManager = new WindowManager(settingsStore, sessionManager, appLock)
    windowManager.applyLockPrivacy(preferences)
    registerIpc({ windowManager, sessionManager, settingsStore, appLock })

    const trayManager = new TrayManager(windowManager, sessionManager, settingsStore, appLock)
    trayManager.create()
    windowManager.setTrayManager(trayManager)

    const shouldStartHidden = process.argv.includes('--hidden') || preferences.startMinimized
    await windowManager.create(shouldStartHidden)

    const bubbleManager = new BubbleManager(settingsStore, windowManager)
    windowManager.setBubbleManager(bubbleManager)
    windowManager.applyLockPrivacy(preferences)

    const mainWindow = windowManager.getWindow()
    if (mainWindow) {
      setupAutoUpdater(mainWindow)
    }

    logger.info('Aplicação pronta')
  })

  app.on('before-quit', () => {
    windowManager?.setQuitting(true)
    windowManager?.disposeGlobalShortcuts()
    appLock?.dispose()
    disposeAutoUpdater()
  })

  app.on('activate', () => {
    windowManager?.show()
  })

  app.on('window-all-closed', () => {
    // Mantem o app vivo na bandeja ate o usuario escolher "Sair".
  })
}
