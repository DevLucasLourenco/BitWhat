import { nativeTheme } from 'electron'
import type { ThemePreference } from '../../shared/types'
import { logger } from './logger'

const DARK_WINDOW_BACKGROUND = '#111827'
const LIGHT_WINDOW_BACKGROUND = '#f7faf9'
const DARK_WHATSAPP_BACKGROUND = '#111b21'
const LIGHT_WHATSAPP_BACKGROUND = '#ffffff'

/**
 * Aplica o tema escolhido ao Chromium do Electron.
 *
 * `nativeTheme.themeSource` controla o `prefers-color-scheme` informado a todas
 * as páginas, inclusive o WhatsApp Web dentro do BrowserView. Com o tema do
 * WhatsApp em "Padrão do sistema", ele entra no modo escuro automaticamente.
 */
export function applyNativeTheme(theme: ThemePreference): void {
  if (nativeTheme.themeSource === theme) {
    return
  }

  nativeTheme.themeSource = theme
  logger.info(`Tema nativo aplicado: ${theme}`)
}

export function isDarkThemeActive(): boolean {
  return nativeTheme.shouldUseDarkColors
}

export function getWindowBackgroundColor(): string {
  return isDarkThemeActive() ? DARK_WINDOW_BACKGROUND : LIGHT_WINDOW_BACKGROUND
}

export function getWhatsAppBackgroundColor(): string {
  return isDarkThemeActive() ? DARK_WHATSAPP_BACKGROUND : LIGHT_WHATSAPP_BACKGROUND
}

/** Notifica quando o tema efetivo muda (troca de preferência ou do tema do Windows). */
export function onNativeThemeUpdated(listener: () => void): () => void {
  nativeTheme.on('updated', listener)
  return () => {
    nativeTheme.removeListener('updated', listener)
  }
}
