import { app, Menu, Tray } from 'electron'
import { APP_NAME } from '../../shared/types'
import { getTrayImage } from './assets'
import { logger } from './logger'
import { SessionManager } from './session-manager'
import { WindowManager } from './window-manager'

export class TrayManager {
  private tray?: Tray

  constructor(
    private readonly windowManager: WindowManager,
    private readonly sessionManager: SessionManager
  ) {}

  create(): void {
    this.tray = new Tray(getTrayImage())
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

