import { app, Menu, nativeImage, Tray } from 'electron'
import type { NativeImage } from 'electron'
import { APP_NAME, WhatsAppState } from '../../shared/types'
import { getAssetPath, getTrayImage } from './assets'
import { logger } from './logger'
import { SessionManager } from './session-manager'
import { WindowManager } from './window-manager'

const statusToImageFile: Record<WhatsAppState, string> = {
  ready: 'tray.png',
  loading: 'tray-loading.png',
  initializing: 'tray-loading.png',
  'waiting-login': 'tray-attention.png',
  'session-cleared': 'tray-attention.png',
  'connection-error': 'tray-error.png',
  'unsupported-browser': 'tray-error.png'
}

const statusToTooltip: Record<WhatsAppState, string> = {
  ready: 'BitWhat — Conectado',
  loading: 'BitWhat — Carregando',
  initializing: 'BitWhat — Iniciando',
  'waiting-login': 'BitWhat — Aguardando login',
  'session-cleared': 'BitWhat — Sessão limpa',
  'connection-error': 'BitWhat — Erro de conexão',
  'unsupported-browser': 'BitWhat — Navegador recusado'
}

export class TrayManager {
  private tray?: Tray
  private images: Partial<Record<WhatsAppState, NativeImage>> = {}

  constructor(
    private readonly windowManager: WindowManager,
    private readonly sessionManager: SessionManager
  ) {}

  create(): void {
    this.preloadImages()
    this.tray = new Tray(this.getImage('ready'))
    this.tray.setToolTip(APP_NAME)
    this.tray.on('click', () => this.windowManager.toggle())
    this.refreshMenu()
    logger.info('Ícone da bandeja criado')
  }

  refreshMenu(): void {
    if (!this.tray) {
      return
    }

    const menu = Menu.buildFromTemplate([
      {
        label: 'Abrir WhatsApp',
        click: () => this.windowManager.show()
      },
      {
        label: 'Recarregar',
        click: () => this.windowManager.reloadWhatsApp()
      },
      {
        label: 'Limpar sessão/logout',
        click: () => {
          void this.clearSession()
        }
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          this.windowManager.setQuitting(true)
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(menu)
  }

  updateStatus(state: WhatsAppState): void {
    if (!this.tray) {
      return
    }

    const image = this.getImage(state)
    if (!image.isEmpty()) {
      this.tray.setImage(image)
    }
    this.tray.setToolTip(statusToTooltip[state] ?? APP_NAME)
  }

  private preloadImages(): void {
    for (const state of Object.keys(statusToImageFile) as WhatsAppState[]) {
      const fileName = statusToImageFile[state]
      const image = nativeImage.createFromPath(getAssetPath(fileName))
      if (!image.isEmpty()) {
        this.images[state] = image
      }
    }
  }

  private getImage(state: WhatsAppState): NativeImage {
    return this.images[state] ?? this.images.ready ?? getTrayImage()
  }

  private async clearSession(): Promise<void> {
    try {
      await this.sessionManager.clearWhatsappSession()
      this.windowManager.markSessionCleared()
      this.windowManager.reloadWhatsApp()
      this.windowManager.show()
    } catch (error) {
      logger.error('Falha ao limpar sessão pelo menu da bandeja', error)
    }
  }
}
