import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { APP_NAME } from '../../shared/types'

type LogLevel = 'info' | 'warn' | 'error'

// Log técnico em arquivo (userData/logs/bitwhat.log) para diagnosticar falhas
// intermitentes, como a queda do processo do WhatsApp. Só eventos do app:
// nada de mensagens, contatos ou conteúdo do WhatsApp. Gira ao passar de 512 KB.
const MAX_LOG_BYTES = 512 * 1024
let logFile: string | null | undefined

function getLogFile(): string | null {
  if (logFile !== undefined) {
    return logFile
  }

  try {
    const dir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(dir, { recursive: true })
    logFile = path.join(dir, 'bitwhat.log')
  } catch {
    logFile = null
  }

  return logFile
}

function appendToFile(line: string): void {
  const file = getLogFile()
  if (!file) {
    return
  }

  try {
    if (fs.existsSync(file) && fs.statSync(file).size > MAX_LOG_BYTES) {
      fs.renameSync(file, `${file}.old`)
    }
    fs.appendFileSync(file, `${line}\n`)
  } catch {
    // Log em arquivo é best-effort; nunca deve derrubar o app.
  }
}

function write(level: LogLevel, message: string, error?: unknown, toFile = true): void {
  const timestamp = new Date().toISOString()
  const prefix = `[${APP_NAME}] [${timestamp}] [${level}]`
  const detail = error instanceof Error ? `: ${error.message}` : error ? ` ${String(error)}` : ''

  if (error && !(error instanceof Error)) {
    console[level](`${prefix} ${message}`, error)
  } else {
    console[level](`${prefix} ${message}${detail}`)
  }

  if (toFile) {
    appendToFile(`${prefix} ${message}${detail}`)
  }
}

export const logger = {
  info: (message: string) => write('info', message),
  warn: (message: string, error?: unknown) => write('warn', message, error),
  error: (message: string, error?: unknown) => write('error', message, error),
  // Diagnóstico verboso do painel: só console. Pode citar rótulos (aria-label)
  // de elementos do WhatsApp, então não vai para o arquivo.
  diagnostic: (message: string) => write('info', message, undefined, false)
}
