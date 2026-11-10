import {
  app,
  BrowserView,
  BrowserWindow,
  globalShortcut,
  Menu,
  screen
} from 'electron'
import type { DownloadItem, Rectangle, WebContents } from 'electron'
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
  WhatsAppState,
  WhatsAppStatus
} from '../../shared/types'
import { IPC } from '../../shared/ipc'
import { getAssetPath } from './assets'
import { attachNavigationGuard } from './navigation-guard'
import { SessionManager } from './session-manager'
import { SettingsStore } from './settings-store'
import { TrayManager } from './tray-manager'
import { logger } from './logger'
import {
  applyNativeTheme,
  getWhatsAppBackgroundColor,
  getWindowBackgroundColor,
  onNativeThemeUpdated
} from './theme-manager'
import {
  createApplyWhatsAppThemeScript,
  createEnableWhatsAppPanelScript,
  WHATSAPP_PANEL_CSS,
  WHATSAPP_THEME_CSS
} from './whatsapp-panel-mode'
import { createWhatsAppLoginScreenScript, WHATSAPP_LOGIN_CSS } from './whatsapp-login-screen'

const MIN_WIDTH = 360
const MIN_HEIGHT = 560
// Tamanho com que a janela sempre abre. Pode ser redimensionada durante o uso,
// mas a próxima abertura volta a este tamanho (a posição salva é mantida).
const DEFAULT_PANEL_WIDTH = 380
const DEFAULT_PANEL_HEIGHT = 618
const IMAGE_WINDOW_WIDTH = 760
const IMAGE_WINDOW_HEIGHT = 800
// Mini: cabeçalho da conversa em linha (avatar + nome), mensagens e campo de
// texto empilhados. A área do WhatsApp tem MINI_VIEW_HEIGHT abaixo da barra do app.
const MINI_MIN_WIDTH = 380
const MINI_MIN_HEIGHT = 260
const MINI_WINDOW_WIDTH = 440
const MINI_VIEW_HEIGHT = 300
// Altura máxima aceita para a barra do app (topo + painel de configurações).
const MAX_CHROME_HEIGHT = 640
// Enquanto o WhatsApp não está pronto, o estado é reavaliado periodicamente:
// o login por QR e a tela de carregamento do WhatsApp não geram novo evento de página.
const STATE_PROBE_INTERVAL_MS = 2_000
// Sem lista de conversas nem QR depois disso, assume carregado (seletores podem mudar).
const STATE_FALLBACK_READY_MS = 30_000
// Se o processo da view do WhatsApp cai (falta de memória, crash), a view para
// de pintar e aparece o fundo azul-escuro da janela, sem interação. O app
// recarrega sozinho; após várias quedas seguidas, deixa a decisão ao usuário.
const CRASH_RECOVERY_DELAY_MS = 1_500
const CRASH_RECOVERY_WINDOW_MS = 10 * 60 * 1000
const MAX_CRASH_RECOVERIES = 3
// Página travada (sem responder) por este tempo é recarregada.
const UNRESPONSIVE_RELOAD_MS = 30_000
const DEFAULT_MARGIN = 16

const SHORTCUT_TOGGLE_WINDOW = 'CommandOrControl+Shift+W'
const SHORTCUT_RELOAD_WHATSAPP = 'CommandOrControl+Shift+R'
const MAX_RELOAD_ATTEMPTS = 3
const LOAD_TIMEOUT_MS = 25_000
const GC_INTERVAL_MS = 30 * 60 * 1000

const rafScheduler: (cb: () => void) => number =
  typeof globalThis.requestAnimationFrame === 'function'
    ? (cb) => globalThis.requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 16) as unknown as number

const rafCanceler: (id: number) => void =
  typeof globalThis.cancelAnimationFrame === 'function'
    ? (id) => globalThis.cancelAnimationFrame(id)
    : (id) => clearTimeout(id)

const getImageFilename = (suggestedFilename: string, imageUrl: string): string => {
  let filename = suggestedFilename

  if (!filename) {
    try {
      const url = new URL(imageUrl)
      filename = decodeURIComponent(url.pathname.split('/').pop() || '')
    } catch {
      filename = ''
    }
  }

  const safeFilename = filename
    .split(/[\\/]/)
    .pop()
    ?.replace(/[<>:"|?*\u0000-\u001f]/g, '_')
    .trim()

  return safeFilename || 'imagem'
}

const getImageExtension = (mimeType: string): string => {
  const imageExtensions: Record<string, string> = {
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tiff',
    'image/webp': 'webp'
  }

  const normalizedMimeType = mimeType.toLowerCase().split(';')[0] || ''
  return imageExtensions[normalizedMimeType] || 'png'
}

export class WindowManager {
  private mainWindow?: BrowserWindow | undefined
  private whatsappView?: BrowserView | undefined
  private readonly settingsStore: SettingsStore
  private readonly sessionManager: SessionManager
  private trayManager?: TrayManager | undefined
  private status: WhatsAppStatus = this.createStatus('initializing', 'Inicializando')
  private chromeHeight: number
  private saveBoundsTimer?: NodeJS.Timeout | undefined
  private panelCssKey?: string | undefined
  private themeCssKey?: string | undefined
  private loginCssKey?: string | undefined
  private isQuitting = false
  private allowProgrammaticEscape = false
  private currentPanel: WhatsAppPanelMode = resolveWhatsAppPanelMode(DEFAULT_PREFERENCES)
  private boundsBeforeMini?: Rectangle | undefined
  private boundsBeforeImage?: Rectangle | undefined
  private panelBeforeImage?: WhatsAppPanelMode | undefined
  private reloadAttempts = 0
  private loadTimeoutTimer?: NodeJS.Timeout | undefined
  private resizeRafId?: number | undefined
  private gcInterval?: NodeJS.Timeout | undefined
  private disposeThemeListener?: (() => void) | undefined
  private stateProbeTimer?: NodeJS.Timeout | undefined
  private crashTimes: number[] = []
  private unresponsiveTimer?: NodeJS.Timeout | undefined
  private loadStartedAt = Date.now()

  constructor(settingsStore: SettingsStore, sessionManager: SessionManager) {
    this.settingsStore = settingsStore
    this.sessionManager = sessionManager
    this.chromeHeight = settingsStore.getChromeHeight()
  }

  async create(startHidden: boolean): Promise<void> {
    Menu.setApplicationMenu(null)

    const preferences = this.settingsStore.updatePreferences({ whatsappPanel: 'contacts' })
    const initialBounds = this.getInitialBounds()
    this.mainWindow = new BrowserWindow({
      ...initialBounds,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      title: APP_NAME,
      icon: getAssetPath('icon.png'),
      show: false,
      resizable: true,
      autoHideMenuBar: true,
      backgroundColor: getWindowBackgroundColor(),
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    })

    // Em monitores com escalas diferentes (ex.: principal 100% e secundário 150%),
    // o Electron converte os bounds do construtor com a escala errada e a janela
    // abre ampliada. Reaplicar com a janela já no monitor de destino corrige.
    this.mainWindow.setBounds(initialBounds)

    this.mainWindow.setAlwaysOnTop(preferences.alwaysOnTop, 'floating')
    this.bindWindowEvents()
    this.createWhatsappView()
    this.disposeThemeListener = onNativeThemeUpdated(() => this.syncBackgroundColors())
    this.setBackgroundThrottling(false)
    await this.loadRenderer()
    this.loadWhatsApp()

    this.mainWindow.once('ready-to-show', () => {
      if (!startHidden) {
        this.show()
      }
    })

    this.registerGlobalShortcuts()
    this.startPeriodicGc()

    logger.info('Janela principal criada')
  }

  setTrayManager(trayManager: TrayManager): void {
    this.trayManager = trayManager
  }

  disposeGlobalShortcuts(): void {
    this.unregisterGlobalShortcuts()
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

    this.setBackgroundThrottling(false)
    this.ensureVisibleOnDisplay()
    this.mainWindow.show()
    this.mainWindow.focus()
  }

  hide(): void {
    if (!this.mainWindow) {
      return
    }

    this.mainWindow.hide()
    this.setBackgroundThrottling(true)
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
    this.loadStartedAt = Date.now()
    this.setStatus(this.createStatus('loading', 'Carregando WhatsApp Web'))
    this.whatsappView?.webContents.setUserAgent(WHATSAPP_BROWSER_USER_AGENT)
    this.whatsappView?.webContents.loadURL(WHATSAPP_URL, {
      userAgent: this.getDesktopChromeUserAgent()
    })
    this.scheduleLoadTimeout()
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
    this.sessionManager.setNotificationsMuted(preferences.muteNotifications)
    this.trayManager?.refreshMenu()
    applyNativeTheme(preferences.theme)
    this.syncBackgroundColors()

    this.applyPanelWindowMode(panelMode)

    this.mainWindow.webContents.send(IPC.preferencesChanged, preferences)
    await this.applyWhatsAppTheme(preferences.theme)
    await this.applyWhatsAppPanelMode(panelMode)
  }

  setChromeHeight(height: number): void {
    const clamped = Math.max(48, Math.min(MAX_CHROME_HEIGHT, Math.round(height)))
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
    this.unregisterGlobalShortcuts()
    this.stopPeriodicGc()
    this.clearLoadTimeout()
    this.isQuitting = true
    app.quit()
  }

  private async loadRenderer(): Promise<void> {
    if (!this.mainWindow) {
      return
    }

    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    if (rendererUrl) {
      await this.mainWindow.loadURL(rendererUrl)
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
        preload: path.join(__dirname, '../preload/whatsapp.js'),
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
    this.whatsappView.setBackgroundColor(getWhatsAppBackgroundColor())
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
      this.scheduleResizeUpdate()
    })

    this.mainWindow.on('move', () => this.scheduleBoundsSave())

    this.mainWindow.on('closed', () => {
      if (this.resizeRafId !== undefined) {
        rafCanceler(this.resizeRafId)
        this.resizeRafId = undefined
      }
      this.stopPeriodicGc()
      if (this.stateProbeTimer) {
        clearInterval(this.stateProbeTimer)
        this.stateProbeTimer = undefined
      }
      this.disposeThemeListener?.()
      this.disposeThemeListener = undefined
      this.mainWindow = undefined
      this.whatsappView = undefined
    })
  }

  private bindWhatsAppEvents(): void {
    const webContents = this.whatsappView?.webContents
    if (!webContents) {
      return
    }

    webContents.on('context-menu', (event, params) => {
      if (params.mediaType !== 'image' || !params.hasImageContents) {
        return
      }

      event.preventDefault()
      const imageUrl = params.srcURL
      const suggestedFilename = getImageFilename(params.suggestedFilename, imageUrl)
      const menu = Menu.buildFromTemplate([
        {
          label: 'Copiar imagem',
          click: () => webContents.copyImageAt(params.x, params.y)
        },
        {
          label: 'Salvar imagem como…',
          enabled: Boolean(imageUrl),
          click: () => {
            const whatsappSession = webContents.session
            let cleanupTimer: NodeJS.Timeout | undefined
            const cleanup = () => {
              whatsappSession.removeListener('will-download', onWillDownload)
              if (cleanupTimer) {
                clearTimeout(cleanupTimer)
              }
            }
            const onWillDownload = (_downloadEvent: Electron.Event, item: DownloadItem, sourceWebContents: WebContents) => {
              if (sourceWebContents !== webContents || item.getURL() !== imageUrl) {
                return
              }

              const filename = /\.(avif|bmp|gif|jpe?g|png|tiff?|webp)$/i.test(suggestedFilename)
                ? suggestedFilename
                : `${suggestedFilename}.${getImageExtension(item.getMimeType())}`

              item.setSaveDialogOptions({
                title: 'Salvar imagem',
                defaultPath: filename,
                filters: [
                  {
                    name: 'Imagens',
                    extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'tif', 'tiff']
                  },
                  { name: 'Todos os arquivos', extensions: ['*'] }
                ]
              })
              cleanup()
            }

            whatsappSession.on('will-download', onWillDownload)
            cleanupTimer = setTimeout(cleanup, 30_000)
            cleanupTimer.unref()

            try {
              webContents.downloadURL(imageUrl)
            } catch (error) {
              cleanup()
              logger.warn(`Não foi possível iniciar o download da imagem: ${String(error)}`)
            }
          }
        }
      ])

      if (this.mainWindow) {
        menu.popup({ window: this.mainWindow })
      }
    })

    webContents.on('did-start-loading', () => {
      this.loadStartedAt = Date.now()
      this.panelCssKey = undefined
      this.themeCssKey = undefined
      this.loginCssKey = undefined
      this.setStatus(this.createStatus('loading', 'Carregando WhatsApp Web'))

      if (this.mainWindow?.isVisible()) {
        this.whatsappView?.webContents.setBackgroundThrottling(false)
      }
    })

    webContents.on('dom-ready', () => {
      this.clearLoadTimeout()
      if (this.status.state === 'ready' || this.status.state === 'waiting-login') {
        this.reloadAttempts = 0
      }
      void this.applyWhatsAppTheme()
      void this.applyWhatsAppLoginScreen()
      void this.applyWhatsAppPanelMode()
      this.detectWhatsAppState()
    })

    webContents.on('did-finish-load', () => {
      this.clearLoadTimeout()
      if (this.status.state === 'ready' || this.status.state === 'waiting-login') {
        this.reloadAttempts = 0
      }
      void this.applyWhatsAppTheme()
      void this.applyWhatsAppLoginScreen()
      void this.applyWhatsAppPanelMode()
      this.detectWhatsAppState()
    })

    webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) {
        return
      }

      this.clearLoadTimeout()
      logger.warn(`Falha ao carregar WhatsApp Web (${errorCode}) em ${validatedUrl}: ${errorDescription}`)
      this.setStatus(
        this.createStatus('connection-error', 'Erro de conexão', 'Não foi possível carregar o WhatsApp Web.')
      )
    })

    webContents.on('render-process-gone', (_event, details) => {
      logger.warn(`Processo do WhatsApp finalizado: ${details.reason} (código ${details.exitCode})`)
      this.clearUnresponsiveTimer()
      this.recoverFromCrash()
    })

    webContents.on('unresponsive', () => {
      logger.warn('WhatsApp parou de responder')
      this.clearUnresponsiveTimer()
      this.unresponsiveTimer = setTimeout(() => {
        this.unresponsiveTimer = undefined
        logger.warn(`WhatsApp sem responder há ${UNRESPONSIVE_RELOAD_MS / 1000}s; reiniciando o processo`)
        // Encerra o processo travado; 'render-process-gone' cuida de recarregar.
        webContents.forcefullyCrashRenderer()
      }, UNRESPONSIVE_RELOAD_MS)
    })

    webContents.on('responsive', () => {
      if (this.unresponsiveTimer) {
        logger.info('WhatsApp voltou a responder')
      }
      this.clearUnresponsiveTimer()
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
        logger.diagnostic(`Painel WhatsApp: ${message.slice(diagnosticPrefix.length)}`)
        return
      }

      const prefix = '__BITWHAT_PANEL__:'
      if (!message.startsWith(prefix)) {
        return
      }

      const nextPanelMode = message.slice(prefix.length)
      if (nextPanelMode !== 'contacts' && nextPanelMode !== 'chat' && nextPanelMode !== 'mini-chat' && nextPanelMode !== 'image') {
        return
      }

      if (nextPanelMode === 'image') {
        if (this.currentPanel !== 'image') {
          this.panelBeforeImage = this.currentPanel
          this.applyPanelWindowMode('image')
          void this.applyWhatsAppPanelMode('image')
        }
        return
      }

      if (this.currentPanel === 'image') {
        const panelToRestore = this.panelBeforeImage ?? resolveWhatsAppPanelMode(this.settingsStore.getPreferences())
        this.panelBeforeImage = undefined
        this.applyPanelWindowMode(panelToRestore)
        void this.applyWhatsAppPanelMode(panelToRestore)
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
    this.loadStartedAt = Date.now()
    this.setStatus(this.createStatus('loading', 'Carregando WhatsApp Web'))
    this.whatsappView?.webContents.setUserAgent(WHATSAPP_BROWSER_USER_AGENT)
    this.whatsappView?.webContents.loadURL(WHATSAPP_URL, {
      userAgent: this.getDesktopChromeUserAgent()
    })
    this.scheduleLoadTimeout()
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
        if (this.status.state !== 'ready') {
          this.setStatus(this.createStatus('ready', 'WhatsApp carregado'))
        }
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
        if (this.status.state !== 'waiting-login') {
          this.setStatus(this.createStatus('waiting-login', 'Aguardando login/QR Code'))
        }
        return
      }

      // Tela de carregamento do próprio WhatsApp: mantém o estado atual e a
      // sondagem periódica tenta de novo, até o limite de segurança.
      if (Date.now() - this.loadStartedAt < STATE_FALLBACK_READY_MS) {
        return
      }

      this.setStatus(this.createStatus('ready', 'WhatsApp carregado'))
    } catch (error) {
      logger.warn('Falha na detecção mínima de estado do WhatsApp', error)
      this.setStatus(this.createStatus('ready', 'WhatsApp carregado'))
    }
  }

  private recoverFromCrash(): void {
    const now = Date.now()
    this.crashTimes = this.crashTimes.filter((time) => now - time < CRASH_RECOVERY_WINDOW_MS)
    this.crashTimes.push(now)

    if (this.crashTimes.length > MAX_CRASH_RECOVERIES) {
      logger.error(`WhatsApp caiu ${this.crashTimes.length} vezes em 10 min; recuperação automática suspensa`)
      this.setStatus(
        this.createStatus(
          'connection-error',
          'WhatsApp parou',
          'O WhatsApp caiu várias vezes seguidas. Clique em Tentar novamente.'
        )
      )
      return
    }

    logger.info(`Recuperando WhatsApp após queda (${this.crashTimes.length}/${MAX_CRASH_RECOVERIES})`)
    this.setStatus(this.createStatus('loading', 'Recuperando WhatsApp'))
    setTimeout(() => {
      if (this.whatsappView && !this.whatsappView.webContents.isDestroyed()) {
        this.reloadWhatsApp()
      }
    }, CRASH_RECOVERY_DELAY_MS)
  }

  private clearUnresponsiveTimer(): void {
    if (this.unresponsiveTimer) {
      clearTimeout(this.unresponsiveTimer)
      this.unresponsiveTimer = undefined
    }
  }

  private setStatus(status: WhatsAppStatus): void {
    this.status = status
    this.mainWindow?.webContents.send(IPC.statusChanged, status)
    this.trayManager?.updateStatus(status.state)
    this.updateStateProbe()
  }

  private updateStateProbe(): void {
    const pending =
      this.status.state === 'initializing' ||
      this.status.state === 'loading' ||
      this.status.state === 'waiting-login' ||
      this.status.state === 'session-cleared'

    if (pending && !this.stateProbeTimer) {
      this.stateProbeTimer = setInterval(() => void this.detectWhatsAppState(), STATE_PROBE_INTERVAL_MS)
      this.stateProbeTimer.unref()
      return
    }

    if (!pending && this.stateProbeTimer) {
      clearInterval(this.stateProbeTimer)
      this.stateProbeTimer = undefined
    }
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

  private async applyWhatsAppLoginScreen(): Promise<void> {
    const webContents = this.whatsappView?.webContents
    if (!webContents || webContents.isDestroyed()) {
      return
    }

    try {
      if (!this.loginCssKey) {
        this.loginCssKey = await webContents.insertCSS(WHATSAPP_LOGIN_CSS)
      }

      await webContents.executeJavaScript(createWhatsAppLoginScreenScript(), true)
    } catch (error) {
      logger.warn('Falha ao aplicar tela de login do BitWhat', error)
    }
  }

  private syncBackgroundColors(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.setBackgroundColor(getWindowBackgroundColor())
    }

    if (this.whatsappView && !this.whatsappView.webContents.isDestroyed()) {
      this.whatsappView.setBackgroundColor(getWhatsAppBackgroundColor())
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
    const status: WhatsAppStatus = {
      state,
      label,
      updatedAt: new Date().toISOString()
    }

    if (detail !== undefined) {
      status.detail = detail
    }

    return status
  }

  private getInitialBounds(): Rectangle {
    const savedBounds = this.settingsStore.getWindowBounds()
    if (savedBounds) {
      return this.fitBoundsToDisplay({
        ...savedBounds,
        width: DEFAULT_PANEL_WIDTH,
        height: DEFAULT_PANEL_HEIGHT
      })
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

    if (panel === 'image') {
      if (this.currentPanel !== 'image') {
        this.boundsBeforeImage = this.mainWindow.getBounds()
      }

      this.currentPanel = panel
      this.mainWindow.setMinimumSize(MIN_WIDTH, MIN_HEIGHT)

      const bounds = this.mainWindow.getBounds()
      const area = screen.getDisplayMatching(bounds).workArea
      const imageBounds = this.fitBoundsToDisplay({
        ...bounds,
        width: Math.min(IMAGE_WINDOW_WIDTH, area.width),
        height: Math.min(IMAGE_WINDOW_HEIGHT, area.height)
      })
      this.mainWindow.setBounds(imageBounds, true)
      this.updateWhatsAppBounds()
      this.ensureVisibleOnDisplay()
      return
    }

    if (this.currentPanel === 'image') {
      this.currentPanel = panel
      const minimum = this.getMinimumWindowSize(panel)
      this.mainWindow.setMinimumSize(minimum.width, minimum.height)

      if (this.boundsBeforeImage) {
        this.mainWindow.setBounds(this.fitBoundsToDisplay(this.boundsBeforeImage), true)
      }

      this.boundsBeforeImage = undefined
      this.updateWhatsAppBounds()
      this.ensureVisibleOnDisplay()
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
      this.updateWhatsAppBounds()
      this.ensureVisibleOnDisplay()
      return
    }

    const wasMini = this.currentPanel === 'mini-chat'
    this.currentPanel = panel
    this.mainWindow.setMinimumSize(MIN_WIDTH, MIN_HEIGHT)

    if (wasMini && this.boundsBeforeMini) {
      this.mainWindow.setBounds(this.fitBoundsToDisplay(this.boundsBeforeMini), true)
      this.updateWhatsAppBounds()
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

    const [width = 0, height = 0] = this.mainWindow.getContentSize()
    this.whatsappView.setBounds({
      x: 0,
      y: this.chromeHeight,
      width,
      height: Math.max(120, height - this.chromeHeight)
    })
  }

  private scheduleBoundsSave(): void {
    if (!this.mainWindow || this.mainWindow.isMinimized() || this.currentPanel === 'mini-chat' || this.currentPanel === 'image') {
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

  private scheduleResizeUpdate(): void {
    if (this.resizeRafId !== undefined) {
      return
    }

    this.resizeRafId = rafScheduler(() => {
      this.resizeRafId = undefined
      this.updateWhatsAppBounds()
      this.scheduleBoundsSave()
    })
  }

  private scheduleLoadTimeout(): void {
    this.clearLoadTimeout()
    this.loadTimeoutTimer = setTimeout(() => {
      this.handleLoadTimeout()
    }, LOAD_TIMEOUT_MS)
  }

  private clearLoadTimeout(): void {
    if (this.loadTimeoutTimer) {
      clearTimeout(this.loadTimeoutTimer)
      this.loadTimeoutTimer = undefined
    }
  }

  private handleLoadTimeout(): void {
    if (this.status.state === 'ready' || this.status.state === 'waiting-login') {
      return
    }

    this.reloadAttempts += 1
    logger.warn(`Timeout de carregamento. Tentativa ${this.reloadAttempts}/${MAX_RELOAD_ATTEMPTS}`)

    if (this.reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
      this.setStatus(
        this.createStatus(
          'connection-error',
          'Erro de conexão',
          'Não foi possível carregar o WhatsApp Web após várias tentativas. Verifique sua conexão.'
        )
      )
      return
    }

    this.reloadWhatsApp()
  }

  private setBackgroundThrottling(enabled: boolean): void {
    try {
      this.whatsappView?.webContents.setBackgroundThrottling(enabled)
      this.mainWindow?.webContents.setBackgroundThrottling(enabled)
      logger.info(`Background throttling ${enabled ? 'ativado' : 'desativado'}`)
    } catch (error) {
      logger.warn('Falha ao ajustar background throttling', error)
    }
  }

  private registerGlobalShortcuts(): void {
    const toggleRegistered = globalShortcut.register(SHORTCUT_TOGGLE_WINDOW, () => {
      this.toggle()
    })

    if (!toggleRegistered) {
      logger.warn(`Falha ao registrar atalho global: ${SHORTCUT_TOGGLE_WINDOW}`)
    }

    const reloadRegistered = globalShortcut.register(SHORTCUT_RELOAD_WHATSAPP, () => {
      this.reloadWhatsApp()
    })

    if (!reloadRegistered) {
      logger.warn(`Falha ao registrar atalho global: ${SHORTCUT_RELOAD_WHATSAPP}`)
    }

    logger.info('Atalhos globais registrados')
  }

  private unregisterGlobalShortcuts(): void {
    globalShortcut.unregister(SHORTCUT_TOGGLE_WINDOW)
    globalShortcut.unregister(SHORTCUT_RELOAD_WHATSAPP)
    globalShortcut.unregisterAll()
    logger.info('Atalhos globais removidos')
  }

  private startPeriodicGc(): void {
    if (!app.isPackaged) {
      return
    }

    this.gcInterval = setInterval(() => {
      this.runGarbageCollection()
    }, GC_INTERVAL_MS)
  }

  private stopPeriodicGc(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval)
      this.gcInterval = undefined
    }
  }

  private runGarbageCollection(): void {
    const gc = (global as { gc?: () => void }).gc
    if (typeof gc !== 'function') {
      logger.warn('global.gc não exposto — flag --expose-gc pode não ter surtido efeito')
      return
    }

    try {
      gc()
      logger.info('GC executado')
    } catch (error) {
      logger.warn('Falha ao executar GC', error)
    }
  }
}
