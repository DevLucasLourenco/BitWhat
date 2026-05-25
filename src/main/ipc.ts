import { app, ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import { AppPreferences } from '../shared/types'
import { openExternalSafely } from './services/navigation-guard'
import { SessionManager } from './services/session-manager'
import { SettingsStore } from './services/settings-store'
import { WindowManager } from './services/window-manager'
import { logger } from './services/logger'

interface IpcDependencies {
  windowManager: WindowManager
  sessionManager: SessionManager
  settingsStore: SettingsStore
}

export function registerIpc({ windowManager, sessionManager, settingsStore }: IpcDependencies): void {
  ipcMain.handle(IPC.getStatus, () => windowManager.getStatus())
  ipcMain.handle(IPC.getPreferences, () => settingsStore.getPreferences())

  ipcMain.handle(IPC.setPreferences, async (_event, preferences: Partial<AppPreferences>) => {
    const nextPreferences = settingsStore.updatePreferences(preferences ?? {})
    applyLoginItemSettings(nextPreferences)
    await windowManager.applyPreferences(nextPreferences)
    return nextPreferences
  })

  ipcMain.on(IPC.setChromeHeight, (_event, height: number) => {
    if (typeof height === 'number' && Number.isFinite(height)) {
      windowManager.setChromeHeight(height)
    }
  })

  ipcMain.handle(IPC.showWhatsapp, () => windowManager.show())
  ipcMain.handle(IPC.hideWindow, () => windowManager.hide())
  ipcMain.handle(IPC.reloadWhatsapp, () => windowManager.reloadWhatsApp())
  ipcMain.handle(IPC.openExternal, (_event, url: string) => openExternalSafely(url))

  ipcMain.handle(IPC.clearSession, async () => {
    try {
      await sessionManager.clearWhatsappSession()
      windowManager.markSessionCleared()
      windowManager.reloadWhatsApp()
      return { ok: true }
    } catch (error) {
      logger.error('Falha ao limpar sessão pelo IPC', error)
      throw error
    }
  })

  ipcMain.handle(IPC.quit, () => windowManager.quit())
}

export function applyLoginItemSettings(preferences: AppPreferences): void {
  app.setLoginItemSettings({
    openAtLogin: preferences.startWithWindows,
    path: process.execPath,
    args: ['--hidden']
  })
}
