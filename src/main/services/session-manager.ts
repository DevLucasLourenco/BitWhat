import { session, Session } from 'electron'
import type { WebContents } from 'electron'
import {
  WHATSAPP_BROWSER_MAJOR,
  WHATSAPP_BROWSER_USER_AGENT,
  WHATSAPP_PARTITION,
  WHATSAPP_ORIGIN
} from '../../shared/types'
import { isWhatsAppOrigin } from './navigation-guard'
import { logger } from './logger'

const ALLOWED_PERMISSIONS = new Set(['notifications', 'media', 'clipboard-sanitized-write'])
const STATIC_RESOURCE_TYPES = new Set(['stylesheet', 'script', 'image', 'font'])
const CACHEABLE_CACHE_CONTROL = 'public, max-age=86400, immutable'

export class SessionManager {
  private readonly whatsappSession: Session

  constructor() {
    this.whatsappSession = session.fromPartition(WHATSAPP_PARTITION, { cache: true })
  }

  getSession(): Session {
    return this.whatsappSession
  }

  configure(): void {
    this.whatsappSession.setUserAgent(
      WHATSAPP_BROWSER_USER_AGENT,
      'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    )

    this.whatsappSession.webRequest.onBeforeSendHeaders((details, callback) => {
      if (!isWhatsAppOrigin(details.url)) {
        callback({ requestHeaders: details.requestHeaders })
        return
      }

      callback({
        requestHeaders: {
          ...details.requestHeaders,
          'User-Agent': WHATSAPP_BROWSER_USER_AGENT,
          'sec-ch-ua': `"Google Chrome";v="${WHATSAPP_BROWSER_MAJOR}", "Chromium";v="${WHATSAPP_BROWSER_MAJOR}", "Not A(Brand";v="24"`,
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"'
        }
      })
    })

    this.whatsappSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders }

      if (isWhatsAppOrigin(details.url)) {
        responseHeaders['X-Content-Type-Options'] = ['nosniff']
        responseHeaders['X-Frame-Options'] = ['DENY']
      }

      if (STATIC_RESOURCE_TYPES.has(details.resourceType) && this.isCacheableOrigin(details.url)) {
        const existing = responseHeaders['Cache-Control'] ?? responseHeaders['cache-control']
        const existingValue = Array.isArray(existing) ? existing.join(', ') : existing

        if (!existingValue || !/no-store|no-cache/i.test(existingValue)) {
          responseHeaders['Cache-Control'] = [CACHEABLE_CACHE_CONTROL]
        }
      }

      callback({ responseHeaders })
    })

    this.whatsappSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const requestingUrl = details.requestingUrl || webContents.getURL()
      callback(this.isAllowedPermission(webContents, permission, requestingUrl))
    })

    this.whatsappSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      return this.isAllowedPermission(webContents, permission, requestingOrigin)
    })

    logger.info('Sessão persistente isolada configurada')
  }

  async clearWhatsappSession(): Promise<void> {
    await this.whatsappSession.clearStorageData()
    await this.whatsappSession.clearCache()
    await this.whatsappSession.clearAuthCache()
    this.whatsappSession.flushStorageData()
    logger.info('Sessão persistente do WhatsApp limpa')
  }

  private isCacheableOrigin(rawUrl: string): boolean {
    try {
      const url = new URL(rawUrl)
      const hostname = url.hostname.toLowerCase()
      return (
        hostname === 'web.whatsapp.com' ||
        hostname.endsWith('.whatsapp.com') ||
        hostname.endsWith('.whatsapp.net') ||
        hostname.endsWith('.fbcdn.net')
      )
    } catch {
      return false
    }
  }

  private isAllowedPermission(webContents: WebContents | null, permission: string, requestingUrl: string): boolean {
    const currentUrl = webContents?.getURL() ?? WHATSAPP_ORIGIN
    const fromWhatsApp = isWhatsAppOrigin(requestingUrl) || isWhatsAppOrigin(currentUrl)

    return fromWhatsApp && ALLOWED_PERMISSIONS.has(permission)
  }
}
