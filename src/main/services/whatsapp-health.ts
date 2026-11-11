import type { WebContents } from 'electron'
import type { WhatsAppHealth, WhatsAppHealthIssue } from '../../shared/types'
import { logger } from './logger'

// Autodiagnóstico: confere periodicamente se os pontos da página do WhatsApp
// Web dos quais o BitWhat depende continuam existindo. Quando o WhatsApp muda a
// estrutura da página, as personalizações param de funcionar sem erro visível;
// aqui isso vira um registro no log e um aviso discreto na interface.
//
// Privacidade: a sonda só lê a existência de elementos e atributos estruturais
// (ids, roles, estilos). Nunca lê textos, nomes ou mensagens.

type HealthCheckId = 'panel-mode' | 'chat-list' | 'chat-list-grid' | 'chat-rows' | 'chat-item' | 'chat-panel' | 'composer'

// Função do BitWhat afetada quando cada ponto some (mostrada ao usuário).
const CHECK_FEATURES: Record<HealthCheckId, string> = {
  'panel-mode': 'Modos contatos/conversa',
  'chat-list': 'Lista de conversas',
  'chat-list-grid': 'Grade de conversas',
  'chat-rows': 'Grade de conversas',
  'chat-item': 'Abrir conversa pelo teclado',
  'chat-panel': 'Modo conversa',
  composer: 'Foco automático no campo de digitação'
}

const CHECK_IDS = Object.keys(CHECK_FEATURES) as HealthCheckId[]

// Resultado por ponto: true = encontrado, false = ausente, null = não se aplica
// à tela atual (ex.: campo de digitação sem conversa aberta).
type ProbeResults = Partial<Record<HealthCheckId, boolean | null>>
interface ProbeOutput {
  skip?: string
  results?: ProbeResults
}

const PROBE_INTERVAL_MS = 20_000
// Primeira sonda depois que o WhatsApp fica pronto (a lista ainda se monta).
const FIRST_PROBE_DELAY_MS = 8_000
// Sondas seguidas com o ponto ausente antes de avisar (evita alarme durante
// transições de tela) e sondas com ele presente antes de retirar o aviso.
const FAILURES_TO_REPORT = 3
const PASSES_TO_CLEAR = 2

// Seletores espelham os usados em whatsapp-panel-mode.ts e
// whatsapp-chat-grid.ts: ao mudar um deles lá, atualize aqui.
const PROBE_SCRIPT = `
(() => {
  const root = document.documentElement;
  if (document.querySelector('[data-testid="qrcode"], canvas[aria-label], div[data-ref]')) {
    return { skip: 'login' };
  }

  const panel = root.getAttribute('data-bitwhat-panel');
  const pending = root.getAttribute('data-bitwhat-panel-pending');
  const results = { 'panel-mode': Boolean(panel || pending) };
  if (!panel || panel === 'image') {
    return { results };
  }

  if (panel === 'contacts') {
    const pane = document.querySelector('#pane-side');
    results['chat-list'] = Boolean(pane);
    const grid = pane ? pane.querySelector('[role="grid"]') : null;
    results['chat-list-grid'] = pane ? Boolean(grid) : null;
    const rows = grid ? Array.from(grid.children).filter((row) => row.getAttribute('role') === 'row') : [];
    if (rows.length > 0) {
      results['chat-rows'] = rows.some((row) => /translateY\\(/.test(row.style.transform || ''));
      results['chat-item'] = rows.some((row) => row.querySelector('[aria-selected]'));
    }
    return { results };
  }

  // Conversa (padrão ou mini).
  const main = document.querySelector('#main');
  results['chat-panel'] = Boolean(main);
  const health = window.__bitWhatHealth || (window.__bitWhatHealth = { main: null, header: null, misses: 0 });
  const header = main ? main.querySelector('header') : null;
  const composer = main
    ? main.querySelector('footer [contenteditable="true"], [contenteditable="true"][role="textbox"]')
    : null;
  if (!main) {
    results.composer = null;
  } else if (composer) {
    health.misses = 0;
    results.composer = true;
  } else {
    // Algumas conversas não têm campo (canais, contatos bloqueados): só conta
    // como ausente depois de 3 conversas diferentes seguidas sem ele.
    const sameChat = health.main?.deref() === main && health.header?.deref() === header;
    if (!sameChat) {
      health.misses += 1;
    }
    results.composer = health.misses >= 3 ? false : null;
  }
  health.main = main ? new WeakRef(main) : null;
  health.header = header ? new WeakRef(header) : null;
  return { results };
})()
`

interface CheckStreak {
  failures: number
  passes: number
  reported: boolean
}

export class WhatsAppHealthMonitor {
  private timer?: NodeJS.Timeout | undefined
  private active = false
  private probing = false
  private readonly streaks = new Map<HealthCheckId, CheckStreak>()
  private health: WhatsAppHealth = { ok: true, issues: [] }

  constructor(
    private readonly getWebContents: () => WebContents | undefined,
    private readonly onChange: (health: WhatsAppHealth) => void
  ) {}

  getHealth(): WhatsAppHealth {
    return { ...this.health, issues: [...this.health.issues] }
  }

  // Sonda só com o WhatsApp pronto (logado, lista carregada).
  setActive(active: boolean): void {
    if (active === this.active) {
      return
    }
    this.active = active
    this.clearTimer()
    if (active) {
      this.schedule(FIRST_PROBE_DELAY_MS)
    }
  }

  dispose(): void {
    this.active = false
    this.clearTimer()
  }

  private schedule(delay: number): void {
    this.clearTimer()
    this.timer = setTimeout(() => void this.probe(), delay)
    this.timer.unref()
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }

  private async probe(): Promise<void> {
    this.timer = undefined
    const webContents = this.getWebContents()
    if (!this.active || this.probing || !webContents || webContents.isDestroyed() || webContents.isLoading()) {
      if (this.active) {
        this.schedule(PROBE_INTERVAL_MS)
      }
      return
    }

    this.probing = true
    try {
      const output = (await webContents.executeJavaScript(PROBE_SCRIPT, true)) as ProbeOutput | undefined
      if (this.active && output && !output.skip && output.results) {
        this.evaluate(output.results)
      }
    } catch (error) {
      logger.warn('Autodiagnóstico: falha ao executar a sonda', error)
    } finally {
      this.probing = false
      if (this.active) {
        this.schedule(PROBE_INTERVAL_MS)
      }
    }
  }

  private evaluate(results: ProbeResults): void {
    let changed = false

    for (const id of CHECK_IDS) {
      const result = results[id]
      if (result === undefined || result === null) {
        continue
      }
      const streak = this.streaks.get(id) ?? { failures: 0, passes: 0, reported: false }
      if (result) {
        streak.passes += 1
        streak.failures = 0
        if (streak.reported && streak.passes >= PASSES_TO_CLEAR) {
          streak.reported = false
          changed = true
        }
      } else {
        streak.failures += 1
        streak.passes = 0
        if (!streak.reported && streak.failures >= FAILURES_TO_REPORT) {
          streak.reported = true
          changed = true
        }
      }
      this.streaks.set(id, streak)
    }

    if (!changed) {
      return
    }

    const failing = CHECK_IDS.filter((id) => this.streaks.get(id)?.reported)
    const issues: WhatsAppHealthIssue[] = []
    for (const id of failing) {
      const feature = CHECK_FEATURES[id]
      if (!issues.some((issue) => issue.feature === feature)) {
        issues.push({ id, feature })
      }
    }

    this.health = { ok: issues.length === 0, issues, checkedAt: new Date().toISOString() }
    if (issues.length > 0) {
      logger.warn(`Autodiagnóstico: pontos ausentes na página do WhatsApp: ${failing.join(', ')}`)
    } else {
      logger.info('Autodiagnóstico: página do WhatsApp voltou ao esperado')
    }
    this.onChange(this.getHealth())
  }
}
