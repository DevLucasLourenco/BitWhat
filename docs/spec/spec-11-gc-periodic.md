# Spec 11 — Coleta de lixo explícita periódica (GC)

**Prioridade:** P3 — Média
**Esforço estimado:** ~20min
**Arquivos afetados:** `src/main/main.ts`, `src/main/services/window-manager.ts`

## Contexto

O Chromium usa V8 com GC automático, mas em apps Electron de longa duração (BitWhat vive horas/dias na bandeja), fragmentação de memória pode acumular. O WhatsApp Web cria muitos objetos transitórios (mensagens, thumbnails).

## Objetivo

Chamar `global.gc()` (coleta de lixo explícita) a cada 30 minutos em produção para liberar memória não referenciada e reduzir footprint.

## Requisitos funcionais

1. Expor `--expose-gc` no V8 via `app.commandLine.appendSwitch`.
2. A cada 30 minutos, se `global.gc` existir, chamar `global.gc()`.
3. Só em produção (`app.isPackaged === true`). Dev não precisa (V8 em dev já expõe gc em algumas versões).
4. Não chamar se janela estiver em uso intensivo (avaliação: simples 30min fixo é suficiente para MVP).

## Requisitos não funcionais

- `app.commandLine.appendSwitch('js-flags', '--expose-gc')` deve ser chamado ANTES de `app.whenReady()`.
- Verificar `typeof global.gc === 'function'` antes de chamar.
- Uma chamada de `gc()` adiciona ~50-200ms de pause na main thread — aceitável a cada 30min.
- Não logar a cada GC (spam). Logar apenas se falhar (global.gc não exposto).

## Plano de implementação

### Passo 1 — `main.ts`: adicionar flag antes de `whenReady`

Atual (`main.ts:10`):

```ts
const gotSingleInstanceLock = app.requestSingleInstanceLock()
```

Novo:

```ts
if (app.isPackaged) {
  app.commandLine.appendSwitch('js-flags', '--expose-gc')
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
```

### Passo 2 — `window-manager.ts`: timer de GC

Novos campos:

```ts
private gcInterval?: NodeJS.Timeout
private readonly GC_INTERVAL_MS = 30 * 60 * 1000  // 30min
```

Em `create()`, após `logger.info('Janela principal criada')`:

```ts
if (app.isPackaged) {
  this.startPeriodicGc()
}
```

Métodos:

```ts
private startPeriodicGc(): void {
  this.gcInterval = setInterval(() => {
    this.runGarbageCollection()
  }, this.GC_INTERVAL_MS)
  logger.info('GC periódico agendado (30min)')
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
```

### Passo 3 — Limpar intervalo no quit

Em `quit()` (linha ~194):

```ts
quit(): void {
  this.stopPeriodicGc()
  this.isQuitting = true
  app.quit()
}
```

Em `bindWindowEvents()` handler `closed`:

```ts
this.mainWindow.on('closed', () => {
  this.stopPeriodicGc()
  // ... resto
})
```

### Passo 4 — Importar `app` em `window-manager.ts`

Já importado (linha 2): `import { app, BrowserView, BrowserWindow, Menu, screen } from 'electron'`. Pass.

## Verificação

- [ ] Em dev (`npm run dev`): `global.gc` não existe/não é chamado. Nenhum log de GC.
- [ ] Em prod (`npm run build:win`, rodar `.exe`): após 30min, log "GC executado" aparece.
- [ ] Usar Task Manager: após GC, memória RSS do BitWhat cai visivelmente (varia 20-80MB em apps Electron médios).
- [ ] App não congela visivelmente durante GC (pause <200ms).
- [ ] Fechar app não deixa intervalo pendente.
- [ ] `npm run typecheck` sem erros.

## Riscos

- **`--expose-gc` não surtir efeito:** Electron buildado com V8 snapshot pode ignorar flags. Mitigação: verificar log `gc não exposto`. Se for caso, desativar spec e educar usuários de que GC automático já é eficiente.
- **Pausa visível:** Se 200ms de pause incomodar (usuário digitando mensagem), aumentar intervalo para 60min ou 2h. Avaliar com uso real.
- **Feedback visual:** Não há feedback ao usuário — não há necessidade (transparente).

## Observação técnica

Esta spec entrega benefício marginal em apps modernos. Em Electron 42 + V8 recente, GC incremental e concurrent já é eficiente. Esta spec é "defensiva" — recomenda-se priorizar Specs 05 (background throttle) e 06 (cache) antes desta.
