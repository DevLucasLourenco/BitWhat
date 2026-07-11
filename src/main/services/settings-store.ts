import { app } from 'electron'
import type { Rectangle } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  AppPreferences,
  DEFAULT_PREFERENCES
} from '../../shared/types'
import { logger } from './logger'

interface StoredSettings {
  preferences: AppPreferences
  windowBounds?: Rectangle | undefined
  chromeHeight?: number | undefined
}

const SETTINGS_FILE = 'settings.json'
const MIN_CHROME_HEIGHT = 56
const MAX_CHROME_HEIGHT = 420

export class SettingsStore {
  private readonly filePath: string
  private data: StoredSettings

  constructor() {
    this.filePath = path.join(app.getPath('userData'), SETTINGS_FILE)
    this.data = this.load()
  }

  getPreferences(): AppPreferences {
    return { ...this.data.preferences }
  }

  updatePreferences(preferences: Partial<AppPreferences>): AppPreferences {
    this.data.preferences = {
      ...this.data.preferences,
      ...this.sanitizePreferences(preferences)
    }
    this.save()
    return this.getPreferences()
  }

  getWindowBounds(): Rectangle | undefined {
    return this.data.windowBounds ? { ...this.data.windowBounds } : undefined
  }

  setWindowBounds(bounds: Rectangle): void {
    this.data.windowBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(360, Math.round(bounds.width)),
      height: Math.max(560, Math.round(bounds.height))
    }
    this.save()
  }

  getChromeHeight(): number {
    return this.data.chromeHeight ?? 88
  }

  setChromeHeight(height: number): void {
    this.data.chromeHeight = Math.max(MIN_CHROME_HEIGHT, Math.min(MAX_CHROME_HEIGHT, Math.round(height)))
    this.save()
  }

  private load(): StoredSettings {
    try {
      if (!fs.existsSync(this.filePath)) {
        return this.createDefaultSettings()
      }

      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Partial<StoredSettings>
      return {
        preferences: {
          ...DEFAULT_PREFERENCES,
          ...this.sanitizePreferences(parsed.preferences ?? {})
        },
        windowBounds: this.sanitizeBounds(parsed.windowBounds),
        chromeHeight:
          typeof parsed.chromeHeight === 'number'
            ? Math.max(MIN_CHROME_HEIGHT, Math.min(MAX_CHROME_HEIGHT, parsed.chromeHeight))
            : undefined
      }
    } catch (error) {
      logger.warn('Falha ao carregar configurações; usando padrão', error)
      return this.createDefaultSettings()
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8')
    } catch (error) {
      logger.error('Falha ao salvar configurações', error)
    }
  }

  private createDefaultSettings(): StoredSettings {
    return {
      preferences: { ...DEFAULT_PREFERENCES }
    }
  }

  private sanitizePreferences(input: Partial<AppPreferences>): Partial<AppPreferences> {
    const sanitized: Partial<AppPreferences> = {}
    const rawPanel = (input as { whatsappPanel?: unknown }).whatsappPanel
    const rawChatFormat = (input as { chatFormat?: unknown }).chatFormat

    if (typeof input.alwaysOnTop === 'boolean') {
      sanitized.alwaysOnTop = input.alwaysOnTop
    }

    if (typeof input.startMinimized === 'boolean') {
      sanitized.startMinimized = input.startMinimized
    }

    if (typeof input.startWithWindows === 'boolean') {
      sanitized.startWithWindows = input.startWithWindows
    }

    if (rawPanel === 'contacts' || rawPanel === 'chat') {
      sanitized.whatsappPanel = rawPanel
    }

    if (rawPanel === 'mini-chat') {
      sanitized.whatsappPanel = 'chat'
      sanitized.chatFormat = 'mini'
    }

    if (rawChatFormat === 'standard' || rawChatFormat === 'mini') {
      sanitized.chatFormat = rawChatFormat
    }

    if (input.theme === 'system' || input.theme === 'light' || input.theme === 'dark') {
      sanitized.theme = input.theme
    }

    return sanitized
  }

  private sanitizeBounds(bounds: unknown): Rectangle | undefined {
    if (!bounds || typeof bounds !== 'object') {
      return undefined
    }

    const candidate = bounds as Partial<Rectangle>
    if (
      typeof candidate.x !== 'number' ||
      typeof candidate.y !== 'number' ||
      typeof candidate.width !== 'number' ||
      typeof candidate.height !== 'number'
    ) {
      return undefined
    }

    return {
      x: Math.round(candidate.x),
      y: Math.round(candidate.y),
      width: Math.max(360, Math.round(candidate.width)),
      height: Math.max(560, Math.round(candidate.height))
    }
  }
}
