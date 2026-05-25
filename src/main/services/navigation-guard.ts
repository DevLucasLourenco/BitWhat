import { shell } from 'electron'
import type { WebContents } from 'electron'
import { WHATSAPP_ORIGIN } from '../../shared/types'
import { logger } from './logger'

const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function isAllowedWhatsAppNavigation(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return url.origin === WHATSAPP_ORIGIN
  } catch {
    return false
  }
}

export function isWhatsAppOrigin(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).origin === WHATSAPP_ORIGIN
  } catch {
    return false
  }
}

export async function openExternalSafely(rawUrl: string): Promise<void> {
  try {
    const url = new URL(rawUrl)
    if (!SAFE_EXTERNAL_PROTOCOLS.has(url.protocol)) {
      logger.warn(`Link externo bloqueado por protocolo não permitido: ${url.protocol}`)
      return
    }

    await shell.openExternal(url.toString())
  } catch (error) {
    logger.warn('Falha ao abrir link externo', error)
  }
}

export function attachNavigationGuard(webContents: WebContents): void {
  webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedWhatsAppNavigation(url)) {
      return { action: 'allow' }
    }

    void openExternalSafely(url)
    return { action: 'deny' }
  })

  webContents.on('will-navigate', (event, url) => {
    if (isAllowedWhatsAppNavigation(url)) {
      return
    }

    event.preventDefault()
    void openExternalSafely(url)
  })

  webContents.on('will-redirect', (event, url) => {
    if (isAllowedWhatsAppNavigation(url)) {
      return
    }

    event.preventDefault()
    void openExternalSafely(url)
  })
}
