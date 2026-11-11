import { BrowserWindow, ipcMain, Menu, screen } from 'electron'
import type { IpcMainEvent, Point, Rectangle } from 'electron'
import path from 'node:path'
import { IPC } from '../../shared/ipc'
import { logger } from './logger'
import { SettingsStore } from './settings-store'
import type { WindowManager } from './window-manager'

// Balão flutuante: janela pequena, redonda, sempre por cima, fora da barra de
// tarefas e sem roubar o foco. Arrastar move (posição salva), clique abre/oculta
// o BitWhat, botão direito abre um menu. Mostra o número de conversas não lidas
// (só o número, lido do título da página do WhatsApp).
const BUBBLE_SIZE = 64
const SCREEN_MARGIN = 8

export class BubbleManager {
  private window?: BrowserWindow | undefined
  private dragOffset: Point | null = null
  private unread = 0

  constructor(
    private readonly settingsStore: SettingsStore,
    private readonly windowManager: WindowManager
  ) {
    ipcMain.on(IPC.bubbleDragStart, (event, offsetX: unknown, offsetY: unknown) => {
      if (!this.isFromBubble(event) || typeof offsetX !== 'number' || typeof offsetY !== 'number') {
        return
      }
      this.dragOffset = {
        x: Math.max(0, Math.min(BUBBLE_SIZE, offsetX)),
        y: Math.max(0, Math.min(BUBBLE_SIZE, offsetY))
      }
    })

    ipcMain.on(IPC.bubbleDragMove, (event, screenX: unknown, screenY: unknown) => {
      if (!this.isFromBubble(event) || !this.dragOffset || typeof screenX !== 'number' || typeof screenY !== 'number') {
        return
      }
      if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) {
        return
      }
      this.setPosition({ x: Math.round(screenX - this.dragOffset.x), y: Math.round(screenY - this.dragOffset.y) })
    })

    ipcMain.on(IPC.bubbleDragEnd, (event) => {
      if (!this.isFromBubble(event) || !this.window) {
        return
      }
      this.dragOffset = null
      const bounds = this.window.getBounds()
      const position = this.clampToScreen({ x: bounds.x, y: bounds.y })
      this.setPosition(position)
      this.settingsStore.setBubblePosition(position)
    })

    ipcMain.on(IPC.bubbleClick, (event) => {
      if (this.isFromBubble(event)) {
        this.windowManager.toggle()
      }
    })

    ipcMain.on(IPC.bubbleContextMenu, (event) => {
      if (this.isFromBubble(event)) {
        this.showContextMenu()
      }
    })
  }

  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.create()
    } else {
      this.destroy()
    }
  }

  setUnread(count: number): void {
    const next = Math.max(0, Math.floor(count))
    if (next === this.unread) {
      return
    }
    this.unread = next
    this.sendUnread()
  }

  destroy(): void {
    if (!this.window) {
      return
    }
    const window = this.window
    this.window = undefined
    this.dragOffset = null
    if (!window.isDestroyed()) {
      window.destroy()
    }
    logger.info('Balão flutuante desativado')
  }

  private create(): void {
    if (this.window && !this.window.isDestroyed()) {
      return
    }

    const position = this.clampToScreen(this.settingsStore.getBubblePosition() ?? this.defaultPosition())
    const window = new BrowserWindow({
      x: position.x,
      y: position.y,
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop: true,
      show: false,
      title: 'BitWhat',
      webPreferences: {
        preload: path.join(__dirname, '../preload/bubble.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false
      }
    })
    this.window = window

    window.setAlwaysOnTop(true, 'screen-saver')
    // Em monitores com escalas diferentes o construtor pode errar o tamanho.
    window.setBounds({ ...position, width: BUBBLE_SIZE, height: BUBBLE_SIZE })

    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    window.webContents.on('did-finish-load', () => this.sendUnread())
    window.once('ready-to-show', () => window.showInactive())
    window.on('closed', () => {
      if (this.window === window) {
        this.window = undefined
      }
    })

    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    const load = rendererUrl
      ? window.loadURL(`${rendererUrl}/bubble.html`)
      : window.loadFile(path.join(__dirname, '../renderer/bubble.html'))
    load.catch((error) => logger.warn('Falha ao carregar o balão flutuante', error))

    logger.info('Balão flutuante ativado')
  }

  private showContextMenu(): void {
    if (!this.window) {
      return
    }

    const mainWindow = this.windowManager.getWindow()
    const mainVisible = Boolean(mainWindow?.isVisible())
    const menu = Menu.buildFromTemplate([
      {
        label: mainVisible ? 'Ocultar BitWhat' : 'Abrir BitWhat',
        click: () => (mainVisible ? this.windowManager.hide() : this.windowManager.show())
      },
      { type: 'separator' },
      {
        label: 'Desativar balão',
        click: () => {
          const preferences = this.settingsStore.updatePreferences({ floatingBubble: false })
          void this.windowManager.applyPreferences(preferences)
        }
      },
      {
        label: 'Sair',
        click: () => this.windowManager.quit()
      }
    ])
    menu.popup({ window: this.window })
  }

  private sendUnread(): void {
    const webContents = this.window?.webContents
    // Reenviado em did-finish-load, quando o script do balão já escuta.
    if (webContents && !webContents.isDestroyed()) {
      webContents.send(IPC.bubbleUnread, this.unread)
    }
  }

  private setPosition(position: Point): void {
    if (!this.window || this.window.isDestroyed()) {
      return
    }
    // setBounds com tamanho fixo: ao passar entre monitores de escalas
    // diferentes, setPosition sozinho pode redimensionar a janela.
    this.window.setBounds({ x: position.x, y: position.y, width: BUBBLE_SIZE, height: BUBBLE_SIZE })
  }

  private defaultPosition(): Point {
    const area = screen.getPrimaryDisplay().workArea
    return {
      x: area.x + area.width - BUBBLE_SIZE - SCREEN_MARGIN * 2,
      y: area.y + Math.round(area.height * 0.6)
    }
  }

  // Mantém o balão inteiro dentro da área útil do monitor mais próximo (ex.:
  // monitor desconectado desde a última vez).
  private clampToScreen(position: Point): Point {
    const center = { x: position.x + BUBBLE_SIZE / 2, y: position.y + BUBBLE_SIZE / 2 }
    const area: Rectangle = screen.getDisplayNearestPoint(center).workArea
    return {
      x: Math.min(Math.max(position.x, area.x), area.x + area.width - BUBBLE_SIZE),
      y: Math.min(Math.max(position.y, area.y), area.y + area.height - BUBBLE_SIZE)
    }
  }

  private isFromBubble(event: IpcMainEvent): boolean {
    return Boolean(this.window && !this.window.isDestroyed() && event.sender === this.window.webContents)
  }
}
