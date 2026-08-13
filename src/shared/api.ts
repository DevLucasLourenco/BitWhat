import type { AppPreferences, WhatsAppStatus } from './types'

export interface UpdateInfo {
  version: string
}

export interface BitWhatApi {
  getStatus: () => Promise<WhatsAppStatus>
  getPreferences: () => Promise<AppPreferences>
  setPreferences: (preferences: Partial<AppPreferences>) => Promise<AppPreferences>
  setChromeHeight: (height: number) => void
  showWhatsapp: () => Promise<void>
  hideWindow: () => Promise<void>
  reloadWhatsapp: () => Promise<void>
  clearSession: () => Promise<void>
  quit: () => Promise<void>
  openExternal: (url: string) => Promise<void>
  onStatusChanged: (callback: (status: WhatsAppStatus) => void) => () => void
  onPreferencesChanged: (callback: (preferences: AppPreferences) => void) => () => void
  onUpdateReady: (callback: (info: UpdateInfo) => void) => () => void
  installUpdate: () => Promise<void>
}
