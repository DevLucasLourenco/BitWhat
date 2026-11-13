import {
  CheckCircle2,
  DownloadCloud,
  EyeOff,
  FolderOpen,
  Keyboard,
  Lightbulb,
  Loader2,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  PanelLeftClose,
  Pin,
  Power,
  RefreshCw,
  Settings,
  Sun,
  TriangleAlert,
  X
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppPreferences,
  ChatFormat,
  DEFAULT_PREFERENCES,
  RecentChat,
  ThemePreference,
  UpdateCheckResult,
  WhatsAppHealth,
  WhatsAppStatus
} from '../../shared/types'
import type { UpdateInfo } from '../../shared/api'

const DEFAULT_STATUS: WhatsAppStatus = {
  state: 'initializing',
  label: 'Inicializando',
  updatedAt: new Date().toISOString()
}

const themeOptions: Array<{ value: ThemePreference; label: string; icon: JSX.Element }> = [
  { value: 'system', label: 'Sistema', icon: <Monitor size={13} /> },
  { value: 'light', label: 'Claro', icon: <Sun size={13} /> },
  { value: 'dark', label: 'Escuro', icon: <Moon size={13} /> }
]

const chatFormatOptions: Array<{ value: ChatFormat; label: string }> = [
  { value: 'standard', label: 'Padrão' },
  { value: 'mini', label: 'Mini' }
]

type SettingsTab = 'appearance' | 'behavior' | 'notifications' | 'about'
type Overlay = 'none' | 'settings' | 'shortcuts' | 'onboarding'

const settingsTabs: Array<{ value: SettingsTab; label: string }> = [
  { value: 'appearance', label: 'Aparência' },
  { value: 'behavior', label: 'Comportamento' },
  { value: 'notifications', label: 'Notificações' },
  { value: 'about', label: 'Sobre' }
]

const SETTINGS_TAB_KEY = 'bitwhat.settingsTab'

const shortcutGroups: Array<{ title: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    title: 'Geral',
    items: [
      { keys: ['Ctrl', 'Shift', 'W'], label: 'Mostrar ou ocultar o BitWhat (de qualquer lugar)' },
      { keys: ['Ctrl', 'Shift', 'R'], label: 'Recarregar o WhatsApp (também F5 ou Ctrl+R)' },
      { keys: ['Ctrl', '/'], label: 'Esta lista de atalhos (também F1)' }
    ]
  },
  {
    title: 'Lista de conversas',
    items: [
      { keys: ['←', '→', '↑', '↓'], label: 'Escolher uma conversa na grade' },
      { keys: ['Enter'], label: 'Abrir a conversa escolhida' },
      { keys: ['Digitar'], label: 'Buscar conversas (se "Digitar para buscar" estiver ligado)' },
      { keys: ['Ctrl', 'Tab'], label: 'Abrir a última conversa (se "Conversas recentes" estiver ligado)' }
    ]
  },
  {
    title: 'Conversa',
    items: [
      { keys: ['Esc'], label: 'Fechar menu ou painel aberto; sem nada aberto, voltar à lista' },
      { keys: ['Ctrl', 'Tab'], label: 'Ir para a conversa anterior' }
    ]
  },
  {
    title: 'Balão flutuante',
    items: [
      { keys: ['Clique'], label: 'Mostrar ou ocultar o BitWhat' },
      { keys: ['Arrastar'], label: 'Mover o balão' },
      { keys: ['Clique direito'], label: 'Conversas não lidas e opções' }
    ]
  }
]

const onboardingSteps: Array<{ title: string; body: string }> = [
  {
    title: 'Conversas em grade',
    body: 'Use as setas para escolher uma conversa e Enter para abrir. Comece a digitar para buscar.'
  },
  {
    title: 'Troca rápida',
    body: 'Ctrl+Tab volta para a conversa anterior. No chat, a barra de recentes no topo abre as outras.'
  },
  {
    title: 'Esc e atalhos',
    body: 'Esc fecha menus ou volta à lista. Ctrl+Shift+W mostra ou oculta o BitWhat de qualquer lugar. Ctrl+/ lista todos os atalhos.'
  },
  {
    title: 'Balão flutuante',
    body: 'Em Configurações > Comportamento, ligue o balão: fica sempre à vista com o número de não lidas, e o clique direito lista essas conversas.'
  }
]

function readStoredTab(): SettingsTab {
  try {
    const stored = window.localStorage.getItem(SETTINGS_TAB_KEY)
    if (settingsTabs.some((tab) => tab.value === stored)) {
      return stored as SettingsTab
    }
  } catch {
    // Sem armazenamento local: abre na primeira seção.
  }
  return 'appearance'
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? [words[0] ?? '', words[words.length - 1] ?? ''] : words
  return letters.map((word) => Array.from(word)[0] ?? '').join('').toUpperCase() || '?'
}

export function App(): JSX.Element {
  const chromeRef = useRef<HTMLElement | null>(null)
  const [status, setStatus] = useState<WhatsAppStatus>(DEFAULT_STATUS)
  const [preferences, setPreferencesState] = useState<AppPreferences>(DEFAULT_PREFERENCES)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(readStoredTab)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [busyAction, setBusyAction] = useState<'reload' | 'clear' | 'update' | null>(null)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckResult | null>(null)
  const [health, setHealth] = useState<WhatsAppHealth>({ ok: true, issues: [] })
  const [recents, setRecents] = useState<RecentChat[]>([])
  const [version, setVersion] = useState('')

  const settingsOpen = overlay === 'settings'

  const statusTone = useMemo(() => {
    if (status.state === 'ready') return 'ready'
    if (status.state === 'connection-error' || status.state === 'unsupported-browser') return 'error'
    if (status.state === 'waiting-login' || status.state === 'session-cleared') return 'attention'
    return 'loading'
  }, [status.state])

  useEffect(() => {
    void window.bitWhat.getStatus().then(setStatus)
    void window.bitWhat.getPreferences().then((loaded) => {
      setPreferencesState(loaded)
      setPreferencesLoaded(true)
    })
    void window.bitWhat.getHealth().then(setHealth)
    void window.bitWhat.getAppInfo().then((info) => setVersion(info.version))

    const offStatus = window.bitWhat.onStatusChanged(setStatus)
    const offPreferences = window.bitWhat.onPreferencesChanged(setPreferencesState)
    const offUpdateReady = window.bitWhat.onUpdateReady(setUpdateInfo)
    const offHealth = window.bitWhat.onHealthChanged(setHealth)
    const offRecents = window.bitWhat.onRecentsChanged(setRecents)
    const offShortcuts = window.bitWhat.onShowShortcuts(() =>
      setOverlay((current) => (current === 'shortcuts' ? 'none' : 'shortcuts'))
    )

    return () => {
      offStatus()
      offPreferences()
      offUpdateReady()
      offHealth()
      offRecents()
      offShortcuts()
    }
  }, [])

  // Atalhos com o foco na barra do app (no WhatsApp, quem trata é o processo principal).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'F1' || (event.ctrlKey && event.key === '/')) {
        event.preventDefault()
        setOverlay((current) => (current === 'shortcuts' ? 'none' : 'shortcuts'))
        return
      }
      if (event.key === 'Escape' && overlay !== 'none' && overlay !== 'onboarding') {
        setOverlay('none')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [overlay])

  // Boas-vindas: uma vez, depois do primeiro login.
  useEffect(() => {
    if (preferencesLoaded && status.state === 'ready' && !preferences.onboardingDone && overlay === 'none') {
      setOnboardingStep(0)
      setOverlay('onboarding')
    }
    // Só reage ao login e às preferências carregadas (não à troca de painel).
  }, [preferencesLoaded, status.state, preferences.onboardingDone])

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_TAB_KEY, settingsTab)
    } catch {
      // Preferência só de conveniência.
    }
  }, [settingsTab])

  useEffect(() => {
    const element = chromeRef.current
    if (!element) {
      return
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }
      window.bitWhat.setChromeHeight(Math.ceil(entry.contentRect.height))
    })

    resizeObserver.observe(element)
    window.bitWhat.setChromeHeight(Math.ceil(element.getBoundingClientRect().height))

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    document.documentElement.dataset['theme'] = preferences.theme
  }, [preferences.theme])

  async function setPreferences(next: Partial<AppPreferences>): Promise<void> {
    const updated = await window.bitWhat.setPreferences(next)
    setPreferencesState(updated)
  }

  function finishOnboarding(): void {
    setOverlay('none')
    if (!preferences.onboardingDone) {
      void setPreferences({ onboardingDone: true })
    }
  }

  function showContactsPanel(): void {
    void setPreferences({ whatsappPanel: 'contacts' })
  }

  async function reloadWhatsApp(): Promise<void> {
    setBusyAction('reload')
    try {
      await window.bitWhat.reloadWhatsapp()
    } finally {
      setTimeout(() => setBusyAction(null), 400)
    }
  }

  async function clearSession(): Promise<void> {
    const confirmed = window.confirm('Limpar apenas a sessão salva neste aplicativo?')
    if (!confirmed) {
      return
    }

    setBusyAction('clear')
    try {
      await window.bitWhat.clearSession()
    } finally {
      setTimeout(() => setBusyAction(null), 400)
    }
  }

  async function checkForUpdates(): Promise<void> {
    setBusyAction('update')
    setUpdateCheck(null)
    try {
      setUpdateCheck(await window.bitWhat.checkForUpdates())
    } finally {
      setBusyAction(null)
    }
  }

  const otherRecents = recents
    .map((recent, index) => ({ ...recent, index }))
    .filter((recent) => !recent.current)
    .slice(0, 5)
  const showRecentsBar =
    preferences.recentChats && preferences.whatsappPanel === 'chat' && statusTone === 'ready' && otherRecents.length > 0

  return (
    <main className="app-shell">
      <section className="chrome" ref={chromeRef}>
        {updateInfo && (
          <div className="update-banner" role="status" aria-live="polite">
            <span>
              <DownloadCloud size={15} />
              Nova versão {updateInfo.version} disponível.
            </span>
            <button className="text-button" type="button" onClick={() => void window.bitWhat.installUpdate()}>
              Reiniciar agora
            </button>
          </div>
        )}

        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <MessageCircle size={18} strokeWidth={2.4} />
            </span>
            <div className="brand-copy">
              <h1>BitWhat</h1>
              {statusTone !== 'ready' && (
                <span className={`status status-${statusTone}`}>
                  {statusTone === 'loading' && <Loader2 size={14} className="spin" />}
                  {(statusTone === 'attention' || statusTone === 'error') && <TriangleAlert size={14} />}
                  {status.label}
                </span>
              )}
            </div>
          </div>

          <nav className="toolbar" aria-label="Controles">
            <button
              className="icon-button"
              type="button"
              title="Recarregar"
              aria-label="Recarregar"
              onClick={reloadWhatsApp}
              disabled={busyAction === 'reload'}
            >
              <RefreshCw size={17} className={busyAction === 'reload' ? 'spin' : undefined} />
            </button>
            {preferences.whatsappPanel === 'chat' && (
              <button
                className="icon-button"
                type="button"
                title="Voltar aos contatos"
                aria-label="Voltar aos contatos"
                onClick={showContactsPanel}
              >
                <PanelLeftClose size={17} />
              </button>
            )}
            <button
              className={preferences.alwaysOnTop ? 'icon-button active' : 'icon-button'}
              type="button"
              title="Sempre no topo"
              aria-label="Sempre no topo"
              onClick={() => void setPreferences({ alwaysOnTop: !preferences.alwaysOnTop })}
            >
              <Pin size={17} />
            </button>
            <button
              className={settingsOpen ? 'icon-button active' : 'icon-button'}
              type="button"
              title={health.ok ? 'Configurações' : 'Configurações — o WhatsApp mudou; veja o aviso'}
              aria-label={health.ok ? 'Configurações' : 'Configurações (há um aviso)'}
              onClick={() => setOverlay((current) => (current === 'settings' ? 'none' : 'settings'))}
            >
              <Settings size={17} />
              {!health.ok && <span className="health-dot" aria-hidden="true" />}
            </button>
          </nav>
        </header>

        {status.detail && <p className={`status-detail status-${statusTone}`}>{status.detail}</p>}

        {status.state === 'connection-error' && (
          <div className="settings-actions">
            <button className="text-button" type="button" onClick={reloadWhatsApp} disabled={busyAction !== null}>
              <RefreshCw size={16} />
              Tentar novamente
            </button>
          </div>
        )}

        {showRecentsBar && overlay === 'none' && (
          <nav className="recents-bar" aria-label="Conversas recentes">
            {otherRecents.map((recent) => (
              <button
                key={`${recent.index}-${recent.name}`}
                className="recent-chip"
                type="button"
                title={recent.index === 1 ? `${recent.name} (Ctrl+Tab)` : recent.name}
                onClick={() => window.bitWhat.openRecent(recent.index)}
              >
                <span className="recent-avatar" aria-hidden="true">
                  {initials(recent.name)}
                </span>
                <span className="recent-name">{recent.name}</span>
              </button>
            ))}
          </nav>
        )}

        {settingsOpen && (
          <section className="settings-panel" aria-label="Configurações">
            {!health.ok && (
              <div className="health-notice" role="status">
                <TriangleAlert size={14} />
                <p>
                  O WhatsApp Web mudou e algumas funções do BitWhat podem não funcionar:{' '}
                  <strong>{health.issues.map((issue) => issue.feature).join(', ')}</strong>. Tente Recarregar; se
                  continuar, aguarde uma atualização do BitWhat.
                </p>
              </div>
            )}

            <div className="settings-tabs" role="tablist" aria-label="Seções das configurações">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={settingsTab === tab.value}
                  className={settingsTab === tab.value ? 'selected' : undefined}
                  onClick={() => setSettingsTab(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="settings-section" role="tabpanel">
              {settingsTab === 'appearance' && (
                <>
                  <div className="settings-row">
                    <span className="settings-label">Chat</span>
                    <SegmentedControl
                      value={preferences.chatFormat}
                      options={chatFormatOptions}
                      onChange={(chatFormat) => void setPreferences({ chatFormat })}
                    />
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">Tema</span>
                    <SegmentedControl
                      value={preferences.theme}
                      options={themeOptions}
                      onChange={(theme) => void setPreferences({ theme })}
                    />
                  </div>
                </>
              )}

              {settingsTab === 'behavior' && (
                <div className="switch-grid">
                  <SwitchRow
                    checked={preferences.floatingBubble}
                    label="Balão flutuante"
                    onChange={(floatingBubble) => void setPreferences({ floatingBubble })}
                  />
                  <SwitchRow
                    checked={preferences.bubbleDock}
                    disabled={!preferences.floatingBubble}
                    label="Abrir junto ao balão"
                    title="Ao abrir pelo balão, a janela aparece ao lado dele"
                    onChange={(bubbleDock) => void setPreferences({ bubbleDock })}
                  />
                  <SwitchRow
                    checked={preferences.recentChats}
                    label="Conversas recentes"
                    title="Ctrl+Tab e barra de recentes no chat"
                    onChange={(recentChats) => void setPreferences({ recentChats })}
                  />
                  <SwitchRow
                    checked={preferences.typeToSearch}
                    label="Digitar para buscar"
                    title="Na grade, começar a digitar abre a busca"
                    onChange={(typeToSearch) => void setPreferences({ typeToSearch })}
                  />
                  <SwitchRow
                    checked={preferences.startWithWindows}
                    label="Iniciar com Windows"
                    onChange={(startWithWindows) => void setPreferences({ startWithWindows })}
                  />
                  <SwitchRow
                    checked={preferences.startMinimized}
                    label="Iniciar na bandeja"
                    onChange={(startMinimized) => void setPreferences({ startMinimized })}
                  />
                </div>
              )}

              {settingsTab === 'notifications' && (
                <>
                  <div className="switch-grid">
                    <SwitchRow
                      checked={preferences.muteNotifications}
                      label="Silenciar notificações"
                      onChange={(muteNotifications) => void setPreferences({ muteNotifications })}
                    />
                  </div>
                  <p className="settings-hint">O contador de não lidas do balão continua funcionando.</p>
                </>
              )}

              {settingsTab === 'about' && (
                <div className="about">
                  <div className="about-row">
                    <span>
                      BitWhat <strong>{version || '—'}</strong>
                    </span>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => void checkForUpdates()}
                      disabled={busyAction === 'update'}
                    >
                      <RefreshCw size={14} className={busyAction === 'update' ? 'spin' : undefined} />
                      Verificar atualizações
                    </button>
                  </div>
                  {updateCheck && (
                    <p className="settings-hint">
                      {updateCheck.state === 'up-to-date' && 'Você está na versão mais recente.'}
                      {updateCheck.state === 'available' &&
                        `Versão ${updateCheck.version} encontrada; baixando em segundo plano.`}
                      {updateCheck.state === 'unavailable' && updateCheck.reason}
                    </p>
                  )}
                  <p className="settings-hint">
                    {health.ok ? (
                      <>
                        <CheckCircle2 size={13} /> Autodiagnóstico: página do WhatsApp como esperado.
                      </>
                    ) : (
                      <>
                        <TriangleAlert size={13} /> Autodiagnóstico: {health.issues.length} função(ões) com problema.
                      </>
                    )}
                  </p>
                  <div className="about-actions">
                    <button className="text-button" type="button" onClick={() => setOverlay('shortcuts')}>
                      <Keyboard size={14} />
                      Atalhos
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        setOnboardingStep(0)
                        setOverlay('onboarding')
                      }}
                    >
                      <Lightbulb size={14} />
                      Dicas
                    </button>
                    <button className="text-button" type="button" onClick={() => void window.bitWhat.openLogsFolder()}>
                      <FolderOpen size={14} />
                      Logs
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="settings-actions">
              <button className="text-button danger" type="button" onClick={clearSession} disabled={busyAction !== null}>
                <LogOut size={14} />
                Limpar sessão
              </button>
              <button className="text-button" type="button" onClick={() => void window.bitWhat.hideWindow()}>
                <EyeOff size={14} />
                Ocultar
              </button>
              <button className="text-button danger" type="button" onClick={() => void window.bitWhat.quit()}>
                <Power size={14} />
                Sair
              </button>
            </div>
          </section>
        )}

        {overlay === 'shortcuts' && (
          <section className="settings-panel shortcuts-panel" aria-label="Atalhos de teclado">
            <div className="panel-heading">
              <h2>
                <Keyboard size={15} /> Atalhos
              </h2>
              <button
                className="icon-button small"
                type="button"
                title="Fechar (Esc)"
                aria-label="Fechar"
                onClick={() => setOverlay('none')}
              >
                <X size={15} />
              </button>
            </div>
            <div className="shortcut-list">
              {shortcutGroups.map((group) => (
                <div key={group.title} className="shortcut-group">
                  <h3>{group.title}</h3>
                  {group.items.map((item) => (
                    <div key={item.label} className="shortcut-row">
                      <span className="shortcut-keys">
                        {item.keys.map((key) => (
                          <kbd key={key}>{key}</kbd>
                        ))}
                      </span>
                      <span className="shortcut-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {overlay === 'onboarding' && (
          <section className="settings-panel onboarding" aria-label="Dicas do BitWhat" aria-live="polite">
            <div className="panel-heading">
              <h2>
                <Lightbulb size={15} /> {onboardingSteps[onboardingStep]?.title}
              </h2>
              <span className="onboarding-count">
                {onboardingStep + 1}/{onboardingSteps.length}
              </span>
            </div>
            <p>{onboardingSteps[onboardingStep]?.body}</p>
            <div className="onboarding-actions">
              <button className="text-button quiet" type="button" onClick={finishOnboarding}>
                Pular
              </button>
              {onboardingStep < onboardingSteps.length - 1 ? (
                <button className="text-button primary" type="button" onClick={() => setOnboardingStep((step) => step + 1)}>
                  Próxima
                </button>
              ) : (
                <button className="text-button primary" type="button" onClick={finishOnboarding}>
                  Entendi
                </button>
              )}
            </div>
          </section>
        )}
      </section>

      {/* Fica atrás da view do WhatsApp: só aparece se ela parar de pintar
          (ex.: processo do WhatsApp caiu), em vez de uma tela azul vazia. */}
      <section className="view-placeholder" aria-live="polite">
        {statusTone === 'error' ? <TriangleAlert size={22} /> : <Loader2 size={22} className="spin" />}
        <strong>{statusTone === 'ready' ? 'WhatsApp' : status.label}</strong>
        <span>
          {statusTone === 'ready'
            ? 'Se esta área continuar vazia, use Recarregar na barra acima.'
            : status.detail ?? 'Aguarde um instante…'}
        </span>
      </section>
    </main>
  )
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string; icon?: JSX.Element }>
  onChange: (value: T) => void
}

function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>): JSX.Element {
  return (
    <div className="segmented" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          className={option.value === value ? 'selected' : undefined}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface SwitchRowProps {
  checked: boolean
  label: string
  title?: string
  disabled?: boolean
  onChange: (checked: boolean) => void
}

function SwitchRow({ checked, label, title, disabled = false, onChange }: SwitchRowProps): JSX.Element {
  return (
    <label className={disabled ? 'switch-row disabled' : 'switch-row'} title={title}>
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  )
}
