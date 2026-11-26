import { Eye, EyeOff, KeyRound, Loader2, Lock, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  AppPreferences,
  LOCK_IDLE_MINUTES,
  LockPrivacy,
  LockState,
  MAX_LOCK_PASSWORD_LENGTH,
  MIN_LOCK_PASSWORD_LENGTH
} from '../../shared/types'
import { SegmentedControl, SwitchRow } from './controls'

// Senha do próprio BitWhat (opcional). Quem confere a senha e esconde o
// WhatsApp é o processo principal; aqui só ficam a tela de senha e a aba
// Segurança.

const privacyOptions: Array<{ value: LockPrivacy; label: string }> = [
  { value: 'hide', label: 'Ocultar' },
  { value: 'silence', label: 'Silenciar' },
  { value: 'keep', label: 'Manter' }
]

const privacyHints: Record<LockPrivacy, string> = {
  hide: 'Bloqueado, as notificações dizem só "Nova mensagem" e o balão não mostra nomes.',
  silence: 'Bloqueado, sem notificações e sem o balão flutuante.',
  keep: 'Bloqueado, notificações e balão continuam com nomes e mensagens.'
}

const FORGOT_CONFIRM =
  'Esqueceu a senha?\n\nPara proteger suas conversas, o BitWhat vai desconectar o WhatsApp deste computador e remover a senha. ' +
  'Depois, leia o QR Code de novo com o celular.\n\nContinuar?'

function useCountdown(until: number): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (until <= Date.now()) {
      return
    }
    const timer = window.setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= until) {
        window.clearInterval(timer)
      }
    }, 500)
    return () => window.clearInterval(timer)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
  inputRef?: React.RefObject<HTMLInputElement>
  autoComplete?: string
  disabled?: boolean
}

function PasswordField({
  label,
  value,
  onChange,
  autoFocus = false,
  inputRef,
  autoComplete = 'current-password',
  disabled = false
}: PasswordFieldProps): JSX.Element {
  const [visible, setVisible] = useState(false)
  return (
    <label className="password-field">
      <span className="password-label">{label}</span>
      <span className="password-input">
        <input
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          value={value}
          maxLength={MAX_LOCK_PASSWORD_LENGTH}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          spellCheck={false}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <button
          className="icon-button small"
          type="button"
          tabIndex={-1}
          title={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </span>
    </label>
  )
}

export function LockScreen(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'unlock' | 'forgot' | null>(null)
  const [retryUntil, setRetryUntil] = useState(0)
  const wait = useCountdown(retryUntil)

  // Foco no campo sempre que a janela volta a ficar ativa.
  useEffect(() => {
    const focus = (): void => inputRef.current?.focus()
    focus()
    window.addEventListener('focus', focus)
    return () => window.removeEventListener('focus', focus)
  }, [])

  useEffect(() => {
    if (wait === 0 && retryUntil > 0) {
      setError(null)
      setRetryUntil(0)
      inputRef.current?.focus()
    }
  }, [wait, retryUntil])

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!password || busy || wait > 0) {
      return
    }
    setBusy('unlock')
    try {
      const result = await window.bitWhat.unlock(password)
      if (!result.ok) {
        setError(result.error)
        setPassword('')
        if (result.retryAfterMs) {
          setRetryUntil(Date.now() + result.retryAfterMs)
        }
      }
    } finally {
      setBusy(null)
      inputRef.current?.focus()
    }
  }

  async function forgot(): Promise<void> {
    if (busy || !window.confirm(FORGOT_CONFIRM)) {
      return
    }
    setBusy('forgot')
    setError(null)
    try {
      await window.bitWhat.forgotLockPassword()
    } catch {
      setError('Não foi possível desconectar o WhatsApp. Tente de novo.')
      setBusy(null)
    }
  }

  return (
    <section className="lock-screen" aria-label="BitWhat bloqueado">
      <form className="lock-card" onSubmit={(event) => void submit(event)}>
        <span className="lock-mark" aria-hidden="true">
          <LockKeyhole size={22} strokeWidth={2.2} />
        </span>
        <h2>BitWhat bloqueado</h2>
        <PasswordField
          label="Senha do BitWhat"
          value={password}
          onChange={(value) => {
            setPassword(value)
            if (wait === 0) {
              setError(null)
            }
          }}
          inputRef={inputRef}
          autoFocus
          disabled={busy === 'forgot'}
        />
        <p className="lock-error" role="alert">
          {wait > 0 ? `Muitas tentativas. Aguarde ${wait} s.` : error ?? ''}
        </p>
        <button className="text-button primary lock-submit" type="submit" disabled={!password || busy !== null || wait > 0}>
          {busy === 'unlock' ? <Loader2 size={14} className="spin" /> : <Lock size={14} />}
          Desbloquear
        </button>
        <button className="text-button quiet lock-forgot" type="button" onClick={() => void forgot()} disabled={busy !== null}>
          {busy === 'forgot' ? 'Desconectando…' : 'Esqueci a senha'}
        </button>
      </form>
    </section>
  )
}

type FormMode = 'none' | 'create' | 'change' | 'remove'

interface SecuritySettingsProps {
  lock: LockState
  preferences: AppPreferences
  setPreferences: (next: Partial<AppPreferences>) => Promise<void>
}

export function SecuritySettings({
  lock,
  preferences,
  setPreferences
}: SecuritySettingsProps): JSX.Element {
  const [mode, setMode] = useState<FormMode>('none')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Editar um campo apaga o erro anterior.
  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setError(null)
  }

  function open(nextMode: FormMode): void {
    setMode(nextMode)
    setCurrent('')
    setNext('')
    setConfirm('')
    setError(null)
    setNotice(null)
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (busy) {
      return
    }
    if (mode === 'create' || mode === 'change') {
      if (next.length < MIN_LOCK_PASSWORD_LENGTH) {
        setError(`Use pelo menos ${MIN_LOCK_PASSWORD_LENGTH} caracteres.`)
        return
      }
      if (next !== confirm) {
        setError('As senhas não conferem.')
        return
      }
    }
    setBusy(true)
    setError(null)
    try {
      const result =
        mode === 'remove'
          ? await window.bitWhat.removeLockPassword(current)
          : await window.bitWhat.setLockPassword(mode === 'change' ? current : null, next)
      if (!result.ok) {
        setError(result.error)
        return
      }
      const done =
        mode === 'create' ? 'Senha criada.' : mode === 'change' ? 'Senha alterada.' : 'Senha removida.'
      open('none')
      setNotice(done)
    } finally {
      setBusy(false)
    }
  }

  if (mode !== 'none') {
    const title = mode === 'create' ? 'Criar senha' : mode === 'change' ? 'Alterar senha' : 'Remover senha'
    return (
      <form className="security-form" onSubmit={(event) => void submit(event)}>
        {mode !== 'create' && (
          <PasswordField label="Senha atual" value={current} onChange={edit(setCurrent)} autoFocus />
        )}
        {mode !== 'remove' && (
          <>
            <PasswordField
              label="Nova senha"
              value={next}
              onChange={edit(setNext)}
              autoFocus={mode === 'create'}
              autoComplete="new-password"
            />
            <PasswordField
              label="Repetir a nova senha"
              value={confirm}
              onChange={edit(setConfirm)}
              autoComplete="new-password"
            />
          </>
        )}
        {error && (
          <p className="lock-error" role="alert">
            {error}
          </p>
        )}
        <div className="settings-actions">
          <button className="text-button quiet" type="button" onClick={() => open('none')} disabled={busy}>
            Cancelar
          </button>
          <button className={mode === 'remove' ? 'text-button danger' : 'text-button primary'} type="submit" disabled={busy}>
            {busy && <Loader2 size={14} className="spin" />}
            {title}
          </button>
        </div>
      </form>
    )
  }

  if (!lock.enabled) {
    return (
      <>
        <p className="settings-hint">
          <ShieldCheck size={13} /> Peça uma senha para usar o BitWhat. É do BitWhat, não do WhatsApp, e fica só neste
          computador.
        </p>
        <p className="settings-hint">Se esquecer a senha, o WhatsApp é desconectado e você lê o QR Code de novo.</p>
        {notice && <p className="settings-hint">{notice}</p>}
        <div className="settings-actions">
          <button className="text-button primary" type="button" onClick={() => open('create')}>
            <KeyRound size={14} />
            Criar senha
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="switch-grid">
        <SwitchRow
          checked={preferences.lockOnStart}
          label="Pedir ao abrir"
          title="Pede a senha sempre que o BitWhat iniciar"
          onChange={(lockOnStart) => void setPreferences({ lockOnStart })}
        />
        <SwitchRow
          checked={preferences.lockOnSystemLock}
          label="Com o Windows"
          title="Bloqueia quando o Windows é bloqueado (Win+L) ou entra em suspensão"
          onChange={(lockOnSystemLock) => void setPreferences({ lockOnSystemLock })}
        />
        <SwitchRow
          checked={preferences.lockOnIdle}
          label="Sem uso"
          title="Bloqueia depois de um tempo sem usar o computador"
          onChange={(lockOnIdle) => void setPreferences({ lockOnIdle })}
        />
        <label className={preferences.lockOnIdle ? 'switch-row' : 'switch-row disabled'} title="Tempo sem uso para bloquear">
          <span>Após</span>
          <select
            className="compact-select"
            value={preferences.lockIdleMinutes}
            disabled={!preferences.lockOnIdle}
            onChange={(event) => void setPreferences({ lockIdleMinutes: Number(event.currentTarget.value) })}
          >
            {LOCK_IDLE_MINUTES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="settings-row wide-label">
        <span className="settings-label">Bloqueado</span>
        <SegmentedControl
          value={preferences.lockPrivacy}
          options={privacyOptions}
          onChange={(lockPrivacy) => void setPreferences({ lockPrivacy })}
        />
      </div>
      <p className="settings-hint">{privacyHints[preferences.lockPrivacy]}</p>
      {notice && <p className="settings-hint">{notice}</p>}
      <div className="settings-actions">
        <button className="text-button" type="button" title="Ctrl+L" onClick={() => void window.bitWhat.lockNow()}>
          <Lock size={14} />
          Bloquear
        </button>
        <button className="text-button" type="button" onClick={() => open('change')}>
          <KeyRound size={14} />
          Alterar
        </button>
        <button className="text-button danger" type="button" onClick={() => open('remove')}>
          <Trash2 size={14} />
          Remover
        </button>
      </div>
    </>
  )
}
