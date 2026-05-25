import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { BitWhatApi } from '../shared/api'
import { IPC } from '../shared/ipc'
import type { AppPreferences, WhatsAppStatus } from '../shared/types'

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
  onPreferencesChanged: (callback: (preferences: AppPreferences) => void) => {
    const listener = (_event: IpcRendererEvent, preferences: AppPreferences): void => callback(preferences)
    ipcRenderer.on(IPC.preferencesChanged, listener)
    return () => ipcRenderer.removeListener(IPC.preferencesChanged, listener)
  }
}

contextBridge.exposeInMainWorld('bitWhat', api)
