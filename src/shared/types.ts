export const APP_NAME = 'BitWhat'
export const APP_ID = 'br.com.bitwhat.app'
export const WHATSAPP_URL = 'https://web.whatsapp.com/'
export const WHATSAPP_ORIGIN = 'https://web.whatsapp.com'
export const WHATSAPP_PARTITION = 'persist:bitwhat'
export const WHATSAPP_BROWSER_MAJOR = '146'
export const WHATSAPP_BROWSER_USER_AGENT =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/${WHATSAPP_BROWSER_MAJOR}.0.0.0 Safari/537.36`

export type WhatsAppState =
  | 'initializing'
  | 'loading'
  | 'waiting-login'
  | 'ready'
  | 'unsupported-browser'
  | 'connection-error'
  | 'session-cleared'

export interface WhatsAppStatus {
  state: WhatsAppState
  label: string
  detail?: string | undefined
  updatedAt: string
}

export type ThemePreference = 'system' | 'light' | 'dark'
export type WhatsAppPanel = 'contacts' | 'chat'
export type ChatFormat = 'standard' | 'mini'
export type WhatsAppPanelMode = WhatsAppPanel | 'mini-chat'

export interface AppPreferences {
  alwaysOnTop: boolean
  startMinimized: boolean
  startWithWindows: boolean
  whatsappPanel: WhatsAppPanel
  chatFormat: ChatFormat
  theme: ThemePreference
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  alwaysOnTop: false,
  startMinimized: false,
  startWithWindows: false,
  whatsappPanel: 'contacts',
  chatFormat: 'standard',
  theme: 'system'
}

export function resolveWhatsAppPanelMode(preferences: Pick<AppPreferences, 'whatsappPanel' | 'chatFormat'>): WhatsAppPanelMode {
  if (preferences.whatsappPanel === 'chat' && preferences.chatFormat === 'mini') {
    return 'mini-chat'
  }

  return preferences.whatsappPanel
}
