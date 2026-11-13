import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { BitWhatApi, UpdateInfo } from '../shared/api'
import { IPC } from '../shared/ipc'
import type { AppPreferences, RecentChat, WhatsAppHealth, WhatsAppStatus } from '../shared/types'

const api: BitWhatApi = {
  getStatus: () => ipcRenderer.invoke(IPC.getStatus),
  getPreferences: () => ipcRenderer.invoke(IPC.getPreferences),
  setPreferences: (preferences: Partial<AppPreferences>) => ipcRenderer.invoke(IPC.setPreferences, preferences),
  setChromeHeight: (height: number) => ipcRenderer.send(IPC.setChromeHeight, height),
  showWhatsapp: () => ipcRenderer.invoke(IPC.showWhatsapp),
  hideWindow: () => ipcRenderer.invoke(IPC.hideWindow),
  reloadWhatsapp: () => ipcRenderer.invoke(IPC.reloadWhatsapp),
  clearSession: () => ipcRenderer.invoke(IPC.clearSession),
  quit: () => ipcRenderer.invoke(IPC.quit),
  openExternal: (url: string) => ipcRenderer.invoke(IPC.openExternal, url),
  onStatusChanged: (callback: (status: WhatsAppStatus) => void) => {
    const listener = (_event: IpcRendererEvent, status: WhatsAppStatus): void => callback(status)
    ipcRenderer.on(IPC.statusChanged, listener)
    return () => ipcRenderer.removeListener(IPC.statusChanged, listener)
  },
  getHealth: () => ipcRenderer.invoke(IPC.getHealth),
  onHealthChanged: (callback: (health: WhatsAppHealth) => void) => {
    const listener = (_event: IpcRendererEvent, health: WhatsAppHealth): void => callback(health)
    ipcRenderer.on(IPC.healthChanged, listener)
    return () => ipcRenderer.removeListener(IPC.healthChanged, listener)
  },
  onPreferencesChanged: (callback: (preferences: AppPreferences) => void) => {
    const listener = (_event: IpcRendererEvent, preferences: AppPreferences): void => callback(preferences)
    ipcRenderer.on(IPC.preferencesChanged, listener)
    return () => ipcRenderer.removeListener(IPC.preferencesChanged, listener)
  },
  onUpdateReady: (callback: (info: UpdateInfo) => void) => {
    const listener = (_event: IpcRendererEvent, info: UpdateInfo): void => callback(info)
    ipcRenderer.on(IPC.updateReady, listener)
    return () => ipcRenderer.removeListener(IPC.updateReady, listener)
  },
  installUpdate: () => ipcRenderer.invoke(IPC.installUpdate),
  getAppInfo: () => ipcRenderer.invoke(IPC.getAppInfo),
  checkForUpdates: () => ipcRenderer.invoke(IPC.checkForUpdates),
  openLogsFolder: () => ipcRenderer.invoke(IPC.openLogsFolder),
  onShowShortcuts: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on(IPC.showShortcuts, listener)
    return () => ipcRenderer.removeListener(IPC.showShortcuts, listener)
  },
  onRecentsChanged: (callback: (recents: RecentChat[]) => void) => {
    const listener = (_event: IpcRendererEvent, recents: RecentChat[]): void => callback(recents)
    ipcRenderer.on(IPC.recentsChanged, listener)
    return () => ipcRenderer.removeListener(IPC.recentsChanged, listener)
  },
  openRecent: (index: number) => ipcRenderer.send(IPC.openRecent, index)
}

contextBridge.exposeInMainWorld('bitWhat', api)
