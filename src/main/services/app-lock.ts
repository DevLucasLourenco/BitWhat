import { powerMonitor } from 'electron'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import {
  LockResult,
  LockState,
  MAX_LOCK_PASSWORD_LENGTH,
  MIN_LOCK_PASSWORD_LENGTH
} from '../../shared/types'
import { logger } from './logger'
import type { LockSecret, SettingsStore } from './settings-store'

// Senha do próprio BitWhat (opcional; não é a do WhatsApp). Fica só neste
// computador, guardada como hash scrypt com sal: não dá para recuperá-la.
// Esquecer a senha só se resolve desconectando o WhatsApp (ver ipc.ts).

const SCRYPT_N = 1 << 15
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 32
// Tentativas erradas seguidas antes de começar a esperar.
const FREE_ATTEMPTS = 5
const FIRST_WAIT_MS = 30_000
const MAX_WAIT_MS = 5 * 60_000
const IDLE_CHECK_MS = 15_000

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFC'), salt, KEY_LENGTH, { N: n, r, p, maxmem: 256 * n * r }, (error, key) =>
      error ? reject(error) : resolve(key)
    )
  })
}

function isValidPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_LOCK_PASSWORD_LENGTH
}

export class AppLock {
  private locked = false
  private failures = 0
  private blockedUntil = 0
  private idleTimer?: NodeJS.Timeout | undefined
  private readonly listeners = new Set<(state: LockState) => void>()
  private readonly onSystemLock = (): void => {
    if (this.settingsStore.getPreferences().lockOnSystemLock) {
      this.lock('Windows bloqueado ou em suspensão')
    }
  }

  constructor(private readonly settingsStore: SettingsStore) {}

  // Chamado na partida, antes de criar a janela: se pedido, já abre bloqueado.
  start(): void {
    if (this.isEnabled() && this.settingsStore.getPreferences().lockOnStart) {
      this.locked = true
      logger.info('BitWhat iniciado bloqueado')
    }
    powerMonitor.on('lock-screen', this.onSystemLock)
    powerMonitor.on('suspend', this.onSystemLock)
    this.idleTimer = setInterval(() => this.checkIdle(), IDLE_CHECK_MS)
  }

  dispose(): void {
    powerMonitor.off('lock-screen', this.onSystemLock)
    powerMonitor.off('suspend', this.onSystemLock)
    if (this.idleTimer) {
      clearInterval(this.idleTimer)
      this.idleTimer = undefined
    }
  }

  onChange(listener: (state: LockState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  isEnabled(): boolean {
    return Boolean(this.settingsStore.getLockSecret())
  }

  isLocked(): boolean {
    return this.locked
  }

  getState(): LockState {
    return { enabled: this.isEnabled(), locked: this.locked }
  }

  lock(reason = 'pedido do usuário'): boolean {
    if (!this.isEnabled() || this.locked) {
      return false
    }
    this.locked = true
    logger.info(`BitWhat bloqueado (${reason})`)
    this.emit()
    return true
  }

  async unlock(password: unknown): Promise<LockResult> {
    if (!this.locked) {
      return { ok: true }
    }
    const result = await this.checkPassword(password)
    if (!result.ok) {
      return result
    }
    this.locked = false
    logger.info('BitWhat desbloqueado')
    this.emit()
    return { ok: true }
  }

  // Cria a senha (current = null) ou troca (current = senha atual).
  async setPassword(current: unknown, next: unknown): Promise<LockResult> {
    if (this.locked) {
      return { ok: false, error: 'Desbloqueie o BitWhat primeiro.' }
    }
    if (!isValidPassword(next) || next.length < MIN_LOCK_PASSWORD_LENGTH) {
      return { ok: false, error: `A senha precisa ter de ${MIN_LOCK_PASSWORD_LENGTH} a ${MAX_LOCK_PASSWORD_LENGTH} caracteres.` }
    }
    if (this.isEnabled()) {
      const check = await this.checkPassword(current)
      if (!check.ok) {
        return check
      }
    }

    try {
      const salt = randomBytes(16)
      const hash = await derive(next, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P)
      const created = !this.isEnabled()
      this.settingsStore.setLockSecret({
        salt: salt.toString('hex'),
        hash: hash.toString('hex'),
        n: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P
      })
      logger.info(created ? 'Senha do BitWhat criada' : 'Senha do BitWhat alterada')
      this.emit()
      return { ok: true }
    } catch (error) {
      logger.error('Falha ao gravar a senha do BitWhat', error)
      return { ok: false, error: 'Não foi possível salvar a senha.' }
    }
  }

  async removePassword(current: unknown): Promise<LockResult> {
    if (this.locked) {
      return { ok: false, error: 'Desbloqueie o BitWhat primeiro.' }
    }
    if (!this.isEnabled()) {
      return { ok: true }
    }
    const check = await this.checkPassword(current)
    if (!check.ok) {
      return check
    }
    this.settingsStore.setLockSecret(undefined)
    logger.info('Senha do BitWhat removida')
    this.emit()
    return { ok: true }
  }

  // "Esqueci a senha": quem chama já desconectou o WhatsApp.
  reset(): void {
    this.settingsStore.setLockSecret(undefined)
    this.locked = false
    this.failures = 0
    this.blockedUntil = 0
    logger.info('Senha do BitWhat removida por "Esqueci a senha"')
    this.emit()
  }

  private async checkPassword(password: unknown): Promise<LockResult> {
    const secret = this.settingsStore.getLockSecret()
    if (!secret) {
      return { ok: true }
    }
    const wait = this.blockedUntil - Date.now()
    if (wait > 0) {
      return { ok: false, error: `Muitas tentativas. Aguarde ${Math.ceil(wait / 1000)} s.`, retryAfterMs: wait }
    }
    if (isValidPassword(password) && password.length > 0 && (await this.matches(password, secret))) {
      this.failures = 0
      return { ok: true }
    }

    this.failures += 1
    logger.warn(`Senha do BitWhat incorreta (${this.failures}ª tentativa seguida)`)
    if (this.failures >= FREE_ATTEMPTS) {
      const delay = Math.min(MAX_WAIT_MS, FIRST_WAIT_MS * 2 ** (this.failures - FREE_ATTEMPTS))
      this.blockedUntil = Date.now() + delay
      return { ok: false, error: `Senha incorreta. Aguarde ${Math.ceil(delay / 1000)} s.`, retryAfterMs: delay }
    }
    return { ok: false, error: 'Senha incorreta.' }
  }

  private async matches(password: string, secret: LockSecret): Promise<boolean> {
    try {
      const expected = Buffer.from(secret.hash, 'hex')
      const actual = await derive(password, Buffer.from(secret.salt, 'hex'), secret.n, secret.r, secret.p)
      return actual.length === expected.length && timingSafeEqual(actual, expected)
    } catch (error) {
      logger.error('Falha ao conferir a senha do BitWhat', error)
      return false
    }
  }

  private checkIdle(): void {
    const preferences = this.settingsStore.getPreferences()
    if (!preferences.lockOnIdle || this.locked || !this.isEnabled()) {
      return
    }
    if (powerMonitor.getSystemIdleTime() >= preferences.lockIdleMinutes * 60) {
      this.lock(`${preferences.lockIdleMinutes} min sem uso`)
    }
  }

  private emit(): void {
    const state = this.getState()
    for (const listener of this.listeners) {
      try {
        listener(state)
      } catch (error) {
        logger.warn('Falha ao avisar mudança de bloqueio', error)
      }
    }
  }
}
