import type { AppInfo, AppPreferences, RecentChat, UpdateCheckResult, WhatsAppHealth, WhatsAppStatus } from './types'

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
  getHealth: () => Promise<WhatsAppHealth>
  onHealthChanged: (callback: (health: WhatsAppHealth) => void) => () => void
  onPreferencesChanged: (callback: (preferences: AppPreferences) => void) => () => void
  onUpdateReady: (callback: (info: UpdateInfo) => void) => () => void
  installUpdate: () => Promise<void>
  getAppInfo: () => Promise<AppInfo>
  checkForUpdates: () => Promise<UpdateCheckResult>
  openLogsFolder: () => Promise<void>
  onShowShortcuts: (callback: () => void) => () => void
  onRecentsChanged: (callback: (recents: RecentChat[]) => void) => () => void
  openRecent: (index: number) => void
}
