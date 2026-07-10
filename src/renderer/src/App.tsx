import {
  CheckCircle2,
  Loader2,
  LogOut,
  Maximize2,
  MessageCircle,
  Moon,
  PanelLeftClose,
  Pin,
  Power,
  RefreshCw,
  Settings,
  Sun,
  TriangleAlert
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppPreferences,
  ChatFormat,
  DEFAULT_PREFERENCES,
  ThemePreference,
  WhatsAppStatus
} from '../../shared/types'

const DEFAULT_STATUS: WhatsAppStatus = {
  state: 'initializing',
  label: 'Inicializando',
  updatedAt: new Date().toISOString()
}

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' }
]

const chatFormatOptions: Array<{ value: ChatFormat; label: string }> = [
  { value: 'standard', label: 'Padrão' },
  { value: 'mini', label: 'Mini' }
]

export function App(): JSX.Element {
  const chromeRef = useRef<HTMLElement | null>(null)
  const [status, setStatus] = useState<WhatsAppStatus>(DEFAULT_STATUS)
  const [preferences, setPreferencesState] = useState<AppPreferences>(DEFAULT_PREFERENCES)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<'reload' | 'clear' | null>(null)

  const statusTone = useMemo(() => {
    if (status.state === 'ready') return 'ready'
    if (status.state === 'connection-error' || status.state === 'unsupported-browser') return 'error'
    if (status.state === 'waiting-login' || status.state === 'session-cleared') return 'attention'
    return 'loading'
  }, [status.state])

  useEffect(() => {
    void window.bitWhat.getStatus().then(setStatus)
    void window.bitWhat.getPreferences().then(setPreferencesState)

    const offStatus = window.bitWhat.onStatusChanged(setStatus)
    const offPreferences = window.bitWhat.onPreferencesChanged(setPreferencesState)

    return () => {
      offStatus()
      offPreferences()
    }
  }, [])

  useEffect(() => {
    const element = chromeRef.current
    if (!element) {
      return
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      window.bitWhat.setChromeHeight(Math.ceil(entry.contentRect.height))
    })

    resizeObserver.observe(element)
    window.bitWhat.setChromeHeight(Math.ceil(element.getBoundingClientRect().height))

    return () => resizeObserver.disconnect()
  }, [settingsOpen])

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
  }, [preferences.theme])

  async function setPreferences(next: Partial<AppPreferences>): Promise<void> {
    const updated = await window.bitWhat.setPreferences(next)
    setPreferencesState(updated)
  }

  function setActiveFormat(chatFormat: ChatFormat): void {
    void setPreferences({ chatFormat })
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

  return (
    <main className="app-shell">
      <section className="chrome" ref={chromeRef}>
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <MessageCircle size={18} strokeWidth={2.4} />
            </span>
            <div className="brand-copy">
              <h1>BitWhat</h1>
              <span className={`status status-${statusTone}`}>
                {statusTone === 'ready' && <CheckCircle2 size={14} />}
                {statusTone === 'loading' && <Loader2 size={14} className="spin" />}
                {statusTone === 'attention' && <TriangleAlert size={14} />}
                {statusTone === 'error' && <TriangleAlert size={14} />}
                {status.label}
              </span>
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
              title="Configurações"
              aria-label="Configurações"
              onClick={() => setSettingsOpen((value) => !value)}
            >
              <Settings size={17} />
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

        {settingsOpen && (
          <section className="settings-panel" aria-label="Configurações">
            <div className="settings-grid">
              <fieldset>
                <legend>Formato do chat</legend>
                <SegmentedControl
                  value={preferences.chatFormat}
                  options={chatFormatOptions}
                  onChange={setActiveFormat}
                />
              </fieldset>

              <fieldset>
                <legend>Tema</legend>
                <SegmentedControl
                  value={preferences.theme}
                  options={themeOptions}
                  onChange={(theme) => void setPreferences({ theme })}
                />
              </fieldset>
            </div>

            <div className="switch-list">
              <SwitchRow
                checked={preferences.alwaysOnTop}
                label="Sempre no topo"
                onChange={(alwaysOnTop) => void setPreferences({ alwaysOnTop })}
              />
              <SwitchRow
                checked={preferences.startMinimized}
                label="Iniciar na bandeja"
                onChange={(startMinimized) => void setPreferences({ startMinimized })}
              />
              <SwitchRow
                checked={preferences.startWithWindows}
                label="Iniciar com Windows"
                onChange={(startWithWindows) => void setPreferences({ startWithWindows })}
              />
            </div>

            <div className="settings-actions">
              <button className="text-button" type="button" onClick={reloadWhatsApp} disabled={busyAction !== null}>
                <RefreshCw size={16} />
                Recarregar
              </button>
              <button className="text-button danger" type="button" onClick={clearSession} disabled={busyAction !== null}>
                <LogOut size={16} />
                Limpar sessão
              </button>
              <button className="text-button quiet" type="button" onClick={() => window.bitWhat.hideWindow()}>
                <Maximize2 size={16} />
                Ocultar
              </button>
              <button className="icon-button danger" type="button" title="Sair" aria-label="Sair" onClick={() => window.bitWhat.quit()}>
                <Power size={16} />
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
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
          {String(option.value) === 'light' && <Sun size={14} />}
          {String(option.value) === 'dark' && <Moon size={14} />}
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface SwitchRowProps {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

function SwitchRow({ checked, label, onChange }: SwitchRowProps): JSX.Element {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  )
}
