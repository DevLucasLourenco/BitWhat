export const IPC = {
  getStatus: 'app:get-status',
  getPreferences: 'app:get-preferences',
  setPreferences: 'app:set-preferences',
  setChromeHeight: 'app:set-chrome-height',
  showWhatsapp: 'app:show-whatsapp',
  hideWindow: 'app:hide-window',
  reloadWhatsapp: 'app:reload-whatsapp',
  clearSession: 'app:clear-session',
  quit: 'app:quit',
  openExternal: 'app:open-external',
  statusChanged: 'whatsapp:status-changed',
  preferencesChanged: 'app:preferences-changed',
  updateReady: 'app:update-ready',
  installUpdate: 'app:install-update'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

