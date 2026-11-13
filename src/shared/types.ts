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

// Autodiagnóstico da página do WhatsApp (ver main/services/whatsapp-health.ts).
export interface WhatsAppHealthIssue {
  id: string
  // Função do BitWhat afetada, em texto para o usuário.
  feature: string
}

export interface WhatsAppHealth {
  ok: boolean
  issues: WhatsAppHealthIssue[]
  checkedAt?: string | undefined
}

export type ThemePreference = 'system' | 'light' | 'dark'
export type WhatsAppPanel = 'contacts' | 'chat'
export type ChatFormat = 'standard' | 'mini'
export type WhatsAppPanelMode = WhatsAppPanel | 'mini-chat' | 'image'

export interface AppPreferences {
  alwaysOnTop: boolean
  startMinimized: boolean
  startWithWindows: boolean
  whatsappPanel: WhatsAppPanel
  chatFormat: ChatFormat
  theme: ThemePreference
  muteNotifications: boolean
  floatingBubble: boolean
  // Ctrl+Tab e barra de conversas recentes no modo conversa.
  recentChats: boolean
  // Na grade, começar a digitar abre a busca de conversas.
  typeToSearch: boolean
  // Abrir pelo balão posiciona a janela junto a ele.
  bubbleDock: boolean
  // Dicas de boas-vindas já vistas.
  onboardingDone: boolean
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  alwaysOnTop: false,
  startMinimized: false,
  startWithWindows: false,
  whatsappPanel: 'contacts',
  chatFormat: 'standard',
  theme: 'dark',
  muteNotifications: false,
  floatingBubble: false,
  recentChats: true,
  typeToSearch: true,
  bubbleDock: true,
  onboardingDone: false
}

// Conversa recente mostrada na barra do modo conversa. Só o nome (já visível
// no WhatsApp); nunca é gravado em disco nem no log.
export interface RecentChat {
  name: string
  current: boolean
}

export interface AppInfo {
  version: string
}

export type UpdateCheckResult =
  | { state: 'up-to-date'; version: string }
  | { state: 'available'; version: string }
  | { state: 'unavailable'; reason: string }

export function resolveWhatsAppPanelMode(preferences: Pick<AppPreferences, 'whatsappPanel' | 'chatFormat'>): WhatsAppPanelMode {
  if (preferences.whatsappPanel === 'chat' && preferences.chatFormat === 'mini') {
    return 'mini-chat'
  }

  return preferences.whatsappPanel
}
