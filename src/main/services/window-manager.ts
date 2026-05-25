import {
  app,
  BrowserView,
  BrowserWindow,
  Menu,
  screen
} from 'electron'
import type { Rectangle } from 'electron'
import path from 'node:path'
import {
  APP_NAME,
  AppPreferences,
  DEFAULT_PREFERENCES,
  resolveWhatsAppPanelMode,
  ThemePreference,
  WHATSAPP_PARTITION,
  WHATSAPP_BROWSER_USER_AGENT,
  WHATSAPP_URL,
  WhatsAppPanelMode,
  WhatsAppStatus
} from '../../shared/types'
import { IPC } from '../../shared/ipc'
import { getAssetPath } from './assets'
import { attachNavigationGuard } from './navigation-guard'
import { SessionManager } from './session-manager'
import { SettingsStore } from './settings-store'
import { logger } from './logger'
import {
  createApplyWhatsAppThemeScript,
  createEnableWhatsAppPanelScript,
  WHATSAPP_PANEL_CSS,
  WHATSAPP_THEME_CSS
} from './whatsapp-panel-mode'

const MIN_WIDTH = 360
const MIN_HEIGHT = 560
const DEFAULT_PANEL_WIDTH = 420
const DEFAULT_PANEL_HEIGHT = 720
const MINI_MIN_WIDTH = 420
const MINI_MIN_HEIGHT = 260
const MINI_WINDOW_WIDTH = 520
const MINI_VIEW_HEIGHT = 248
const DEFAULT_MARGIN = 16

export class WindowManager {
  private mainWindow?: BrowserWindow
  private whatsappView?: BrowserView
  private readonly settingsStore: SettingsStore
  private readonly sessionManager: SessionManager
  private status: WhatsAppStatus = this.createStatus('initializing', 'Inicializando')
  private chromeHeight: number
  private saveBoundsTimer?: NodeJS.Timeout
  private panelCssKey?: string
  private themeCssKey?: string
  private isQuitting = false
  private allowProgrammaticEscape = false
  private currentPanel: WhatsAppPanelMode = resolveWhatsAppPanelMode(DEFAULT_PREFERENCES)
  private boundsBeforeMini?: Rectangle

  constructor(settingsStore: SettingsStore, sessionManager: SessionManager) {
    this.settingsStore = settingsStore
    this.sessionManager = sessionManager
    this.chromeHeight = settingsStore.getChromeHeight()
  }

  async create(startHidden: boolean): Promise<void> {
    Menu.setApplicationMenu(null)

    const preferences = this.settingsStore.updatePreferences({ whatsappPanel: 'contacts' })
    this.mainWindow = new BrowserWindow({
      ...this.getInitialBounds(),
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      title: APP_NAME,
      icon: getAssetPath('icon.png'),
      show: false,
      resizable: true,
      autoHideMenuBar: true,
      backgroundColor: preferences.theme === 'dark' ? '#111827' : '#f7faf9',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    })

    this.mainWindow.setAlwaysOnTop(preferences.alwaysOnTop, 'floating')
    this.bindWindowEvents()
    this.createWhatsappView()
    await this.loadRenderer()
    this.loadWhatsApp()

    this.mainWindow.once('ready-to-show', () => {
      if (!startHidden) {
        this.show()
      }
    })

    logger.info('Janela principal criada')
  }

  getWindow(): BrowserWindow | undefined {
    return this.mainWindow
  }

  getStatus(): WhatsAppStatus {
    return { ...this.status }
  }

  show(): void {
    if (!this.mainWindow) {
      return
    }

    this.ensureVisibleOnDisplay()
    this.mainWindow.show()
    this.mainWindow.focus()
  }

  hide(): void {
    this.mainWindow?.hide()
  }

  toggle(): void {
    if (!this.mainWindow) {
      return
    }

    if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
      this.hide()
      return
    }

    this.show()
  }

  reloadWhatsApp(): void {
    this.setStatus(this.createStatus('loading', 'Carregando WhatsApp Web'))
    this.whatsappView?.webContents.setUserAgent(WHATSAPP_BROWSER_USER_AGENT)
    this.whatsappView?.webContents.loadURL(WHATSAPP_URL, {
      userAgent: this.getDesktopChromeUserAgent()
    })
  }

  markSessionCleared(): void {
    this.setStatus(this.createStatus('session-cleared', 'Sessão limpa', 'Faça login novamente pelo QR Code.'))
  }

  async applyPreferences(preferences: AppPreferences): Promise<void> {
    if (!this.mainWindow) {
      return
    }

    const panelMode = resolveWhatsAppPanelMode(preferences)

    if (panelMode === 'contacts' && this.currentPanel !== 'contacts') {
      await this.exitWhatsAppConversation()
    }

    this.mainWindow.setAlwaysOnTop(preferences.alwaysOnTop, 'floating')
    this.mainWindow.setBackgroundColor(preferences.theme === 'dark' ? '#111827' : '#f7faf9')

    this.applyPanelWindowMode(panelMode)

    this.mainWindow.webContents.send(IPC.preferencesChanged, preferences)
    await this.applyWhatsAppTheme(preferences.theme)
    await this.applyWhatsAppPanelMode(panelMode)
  }

  setChromeHeight(height: number): void {
    const clamped = Math.max(56, Math.min(420, Math.round(height)))
    if (this.chromeHeight === clamped) {
      return
    }

    this.chromeHeight = clamped
    this.settingsStore.setChromeHeight(clamped)

    if (this.currentPanel === 'mini-chat' && this.mainWindow) {
      const minimum = this.getMinimumWindowSize('mini-chat')
      this.mainWindow.setMinimumSize(minimum.width, minimum.height)
      this.mainWindow.setContentSize(MINI_WINDOW_WIDTH, minimum.height, true)
    }

    this.updateWhatsAppBounds()
  }

  setQuitting(value: boolean): void {
    this.isQuitting = value
  }

  quit(): void {
    this.isQuitting = true
    app.quit()
  }

  private async loadRenderer(): Promise<void> {
    if (!this.mainWindow) {
      return
    }

    if (process.env.ELECTRON_RENDERER_URL) {
      await this.mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
      return
    }

    await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  private createWhatsappView(): void {
    if (!this.mainWindow) {
      return
    }

    this.whatsappView = new BrowserView({
      webPreferences: {
        partition: WHATSAPP_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: true
      }
    })

    this.mainWindow.setBrowserView(this.whatsappView)
    this.whatsappView.webContents.setUserAgent(WHATSAPP_BROWSER_USER_AGENT)
    this.whatsappView.setBackgroundColor('#ffffff')
    this.updateWhatsAppBounds()
    attachNavigationGuard(this.whatsappView.webContents)
    this.bindWhatsAppEvents()
  }

  private bindWindowEvents(): void {
    if (!this.mainWindow) {
      return
    }

    this.mainWindow.on('close', (event) => {
      if (this.isQuitting) {
        return
      }

      event.preventDefault()
      this.hide()
    })

    this.mainWindow.on('resize', () => {
      this.updateWhatsAppBounds()
      this.scheduleBoundsSave()
    })

    this.mainWindow.on('move', () => this.scheduleBoundsSave())

    this.mainWindow.on('closed', () => {
      this.mainWindow = undefined
      this.whatsappView = undefined
    })
  }

  private bindWhatsAppEvents(): void {
    const webContents = this.whatsappView?.webContents
    if (!webContents) {
      return
    }

    webContents.on('did-start-loading', () => {
      this.panelCssKey = undefined
      this.themeCssKey = undefined
      this.setStatus(this.createStatus('loading', 'Carregando WhatsApp Web'))
    })

    webContents.on('dom-ready', () => {
      void this.applyWhatsAppTheme()
      void this.applyWhatsAppPanelMode()
      this.detectWhatsAppState()
    })

    webContents.on('did-finish-load', () => {
      void this.applyWhatsAppTheme()
      void this.applyWhatsAppPanelMode()
      this.detectWhatsAppState()
    })

    webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) {
        return
      }

      logger.warn(`Falha ao carregar WhatsApp Web (${errorCode}) em ${validatedUrl}: ${errorDescription}`)
      this.setStatus(
        this.createStatus('connection-error', 'Erro de conexão', 'Não foi possível carregar o WhatsApp Web.')
      )
    })

    webContents.on('render-process-gone', (_event, details) => {
      logger.warn(`Processo do WhatsApp finalizado: ${details.reason}`)
      this.setStatus(this.createStatus('connection-error', 'Erro de conexão', 'O processo do WhatsApp foi encerrado.'))
    })

    webContents.on('before-input-event', (event, input) => {
      if (input.key === 'Escape' || input.key === 'Esc') {
        if (!this.allowProgrammaticEscape) {
          event.preventDefault()
        }
        return
      }

      if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
        event.preventDefault()
        this.reloadWhatsApp()
      }
    })

    webContents.on('console-message', (_event, _level, message) => {
      const diagnosticPrefix = '__BITWHAT_PANEL_DIAG__:'
      if (message.startsWith(diagnosticPrefix)) {
        logger.info(`Painel WhatsApp: ${message.slice(diagnosticPrefix.length)}`)
        return
      }

      const prefix = '__BITWHAT_PANEL__:'
      if (!message.startsWith(prefix)) {
        return
      }

      const nextPanelMode = message.slice(prefix.length)
      if (nextPanelMode !== 'contacts' && nextPanelMode !== 'chat' && nextPanelMode !== 'mini-chat') {
        return
      }

      const preferences = this.settingsStore.updatePreferences({
        whatsappPanel: nextPanelMode === 'contacts' ? 'contacts' : 'chat',
        ...(nextPanelMode === 'mini-chat' ? { chatFormat: 'mini' as const } : {})
      })
      void this.applyPreferences(preferences)
    })
  }

  private loadWhatsApp(): void {
    this.setStatus(this.createStatus('loading', 'Carregando WhatsApp Web'))
    this.whatsappView?.webContents.setUserAgent(WHATSAPP_BROWSER_USER_AGENT)
    this.whatsappView?.webContents.loadURL(WHATSAPP_URL, {
      userAgent: this.getDesktopChromeUserAgent()
    })
  }

  private async detectWhatsAppState(): Promise<void> {
    const webContents = this.whatsappView?.webContents
    if (!webContents || webContents.isDestroyed()) {
      return
    }

    try {
      const state = (await webContents.executeJavaScript(
        `(() => {
          const pageText = document.body?.innerText || '';
          const hasChatList = Boolean(
            document.querySelector('#pane-side, [data-testid="chat-list"], [aria-label="Chat list"], [aria-label="Lista de conversas"]')
          );
          const hasQrCandidate = Boolean(
            document.querySelector('[data-testid="qrcode"], canvas[aria-label], div[data-ref]')
          );
          const unsupportedBrowser = /funciona no Google Chrome|update Google Chrome|atualize o Chrome/i.test(pageText);
          return { hasChatList, hasQrCandidate, unsupportedBrowser };
        })()`,
        true
      )) as { hasChatList?: boolean; hasQrCandidate?: boolean; unsupportedBrowser?: boolean }

      if (state.hasChatList) {
        this.setStatus(this.createStatus('ready', 'WhatsApp carregado'))
        return
      }

      if (state.unsupportedBrowser) {
        this.setStatus(
          this.createStatus(
            'unsupported-browser',
            'Navegador recusado',
            'O WhatsApp Web recusou a identidade do Chromium embutido. Recarregue após atualizar o app.'
          )
        )
        return
      }

      if (state.hasQrCandidate) {
        this.setStatus(this.createStatus('waiting-login', 'Aguardando login/QR Code'))
        return
      }

      this.setStatus(this.createStatus('ready', 'WhatsApp carregado'))
    } catch (error) {
      logger.warn('Falha na detecção mínima de estado do WhatsApp', error)
      this.setStatus(this.createStatus('ready', 'WhatsApp carregado'))
    }
  }

  private setStatus(status: WhatsAppStatus): void {
    this.status = status
    this.mainWindow?.webContents.send(IPC.statusChanged, status)
  }

  private async applyWhatsAppPanelMode(panel = resolveWhatsAppPanelMode(this.settingsStore.getPreferences())): Promise<void> {
    const webContents = this.whatsappView?.webContents
    if (!webContents || webContents.isDestroyed()) {
      return
    }

    try {
      if (!this.panelCssKey) {
        this.panelCssKey = await webContents.insertCSS(WHATSAPP_PANEL_CSS)
      }

      await webContents.executeJavaScript(createEnableWhatsAppPanelScript(panel), true)
    } catch (error) {
      logger.warn('Falha ao aplicar modo de painel do WhatsApp', error)
    }
  }

  private async applyWhatsAppTheme(theme: ThemePreference = this.settingsStore.getPreferences().theme): Promise<void> {
    const webContents = this.whatsappView?.webContents
    if (!webContents || webContents.isDestroyed()) {
      return
    }

    try {
      if (!this.themeCssKey) {
        this.themeCssKey = await webContents.insertCSS(WHATSAPP_THEME_CSS)
      }

      await webContents.executeJavaScript(createApplyWhatsAppThemeScript(theme), true)
    } catch (error) {
      logger.warn('Falha ao aplicar tema do WhatsApp', error)
    }
  }

  private async exitWhatsAppConversation(): Promise<void> {
    const webContents = this.whatsappView?.webContents
    if (!webContents || webContents.isDestroyed()) {
      return
    }

    try {
      this.allowProgrammaticEscape = true
      webContents.focus()
      webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' })
      webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' })
      await new Promise((resolve) => setTimeout(resolve, 90))
    } catch (error) {
      logger.warn('Falha ao sair da conversa antes de abrir contatos', error)
    } finally {
      this.allowProgrammaticEscape = false
    }
  }

  private createStatus(state: WhatsAppStatus['state'], label: string, detail?: string): WhatsAppStatus {
    return {
      state,
      label,
      detail,
      updatedAt: new Date().toISOString()
    }
  }

  private getInitialBounds(): Rectangle {
    const savedBounds = this.settingsStore.getWindowBounds()
    if (savedBounds) {
      return this.fitBoundsToDisplay(savedBounds)
    }

    const display = screen.getPrimaryDisplay()
    return {
      width: DEFAULT_PANEL_WIDTH,
      height: DEFAULT_PANEL_HEIGHT,
      x: display.workArea.x + display.workArea.width - DEFAULT_PANEL_WIDTH - DEFAULT_MARGIN,
      y: display.workArea.y + display.workArea.height - DEFAULT_PANEL_HEIGHT - DEFAULT_MARGIN
    }
  }

  private fitBoundsToDisplay(bounds: Rectangle): Rectangle {
    const display = screen.getDisplayMatching(bounds)
    const area = display.workArea
    const minimum = this.getMinimumWindowSize()
    const width = Math.max(minimum.width, Math.min(bounds.width, area.width))
    const height = Math.max(minimum.height, Math.min(bounds.height, area.height))

    return {
      width,
      height,
      x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)),
      y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height))
    }
  }

  private ensureVisibleOnDisplay(): void {
    if (!this.mainWindow) {
      return
    }

    const bounds = this.mainWindow.getBounds()
    this.mainWindow.setBounds(this.fitBoundsToDisplay(bounds))
  }

  private applyPanelWindowMode(panel: WhatsAppPanelMode): void {
    if (!this.mainWindow) {
      return
    }

    if (panel === 'mini-chat') {
      if (this.currentPanel !== 'mini-chat') {
        this.boundsBeforeMini = this.mainWindow.getBounds()
      }

      this.currentPanel = panel
      const minimum = this.getMinimumWindowSize(panel)
      this.mainWindow.setMinimumSize(minimum.width, minimum.height)

      this.mainWindow.setContentSize(MINI_WINDOW_WIDTH, minimum.height, true)
      this.ensureVisibleOnDisplay()
      return
    }

    const wasMini = this.currentPanel === 'mini-chat'
    this.currentPanel = panel
    this.mainWindow.setMinimumSize(MIN_WIDTH, MIN_HEIGHT)

    if (wasMini && this.boundsBeforeMini) {
      this.mainWindow.setBounds(this.fitBoundsToDisplay(this.boundsBeforeMini), true)
      this.boundsBeforeMini = undefined
      this.ensureVisibleOnDisplay()
    }
  }

  private getMinimumWindowSize(panel = this.currentPanel): { width: number; height: number } {
    if (panel === 'mini-chat') {
      return {
        width: MINI_MIN_WIDTH,
        height: Math.max(MINI_MIN_HEIGHT, this.chromeHeight + MINI_VIEW_HEIGHT)
      }
    }

    return {
      width: MIN_WIDTH,
      height: MIN_HEIGHT
    }
  }

  private updateWhatsAppBounds(): void {
    if (!this.mainWindow || !this.whatsappView) {
      return
    }

    const [width, height] = this.mainWindow.getContentSize()
    this.whatsappView.setBounds({
      x: 0,
      y: this.chromeHeight,
      width,
      height: Math.max(120, height - this.chromeHeight)
    })
  }

  private scheduleBoundsSave(): void {
    if (!this.mainWindow || this.mainWindow.isMinimized() || this.currentPanel === 'mini-chat') {
      return
    }

    if (this.saveBoundsTimer) {
      clearTimeout(this.saveBoundsTimer)
    }

    this.saveBoundsTimer = setTimeout(() => {
      if (!this.mainWindow) {
        return
      }

      const bounds = this.mainWindow.getBounds()
      this.settingsStore.setWindowBounds(bounds)
    }, 350)
  }

  private getDesktopChromeUserAgent(): string {
    return this.sessionManager.getSession().getUserAgent()
  }
}
