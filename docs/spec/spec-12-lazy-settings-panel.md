# Spec 12 — Lazy loading do painel de configurações no renderer

**Prioridade:** P3 — Média
**Esforço estimado:** ~30min
**Arquivos afetados:** `src/renderer/src/App.tsx`, novo `src/renderer/src/SettingsPanel.tsx`

## Contexto

`App.tsx` renderiza o painel de configurações inline (linhas 190-248, ~60 linhas de JSX) mesmo quando `settingsOpen === false`. Todo o código do painel está no bundle principal do renderer, carregado no startup. O usuário só abre configurações ocasionalmente.

## Objetivo

Extrair `SettingsPanel` para arquivo próprio e carregar sob demanda via `React.lazy()` + `<Suspense>`, reduzindo tamanho do bundle inicial e tempo de parse/execução no startup.

## Requisitos funcionais

1. Extrair todo o JSX do bloco `{settingsOpen && (...)}` para novo componente `SettingsPanel`.
2. `SettingsPanel` recebe props necessárias (preferences, handlers, busyAction) e renderiza igual ao atual.
3. Carregar usando `React.lazy(() => import('./SettingsPanel'))`.
4. Wrap em `<Suspense fallback={null}>` para não flashar loading.
5. Renderizar `<Suspense><SettingsPanel /></Suspense>` só quando `settingsOpen === true`.

## Requisitos não funcionais

- Não introduzir flash/flicker visual ao abrir Configurações.
- Bundle principal deve ficar menor (após build, verificar `out/renderer/assets/index-*.js`).
- Divisão automática de código via Vite (sem config extra — Vite faz code-splitting em `import()` dinâmico por padrão).

## Plano de implementação

### Passo 1 — Criar `src/renderer/src/SettingsPanel.tsx`

```tsx
import {
  LogOut,
  Maximize2,
  Moon,
  Power,
  RefreshCw,
  Sun
} from 'lucide-react'
import {
  AppPreferences,
  ChatFormat,
  ThemePreference
} from '../../shared/types'

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' }
]

const chatFormatOptions: Array<{ value: ChatFormat; label: string }> = [
  { value: 'standard', label: 'Padrão' },
  { value: 'mini', label: 'Mini' }
]

interface SettingsPanelProps {
  preferences: AppPreferences
  busyAction: 'reload' | 'clear' | null
  onPreferencesChange: (next: Partial<AppPreferences>) => Promise<void>
  onReload: () => Promise<void>
  onClearSession: () => Promise<void>
}

export function SettingsPanel({
  preferences,
  busyAction,
  onPreferencesChange,
  onReload,
  onClearSession
}: SettingsPanelProps): JSX.Element {
  function setActiveFormat(chatFormat: ChatFormat): void {
    void onPreferencesChange({ chatFormat })
  }

  function showContactsPanel(): void {
    void onPreferencesChange({ whatsappPanel: 'contacts' })
  }

  return (
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
            onChange={(theme) => void onPreferencesChange({ theme })}
          />
        </fieldset>
      </div>

      <div className="switch-list">
        <SwitchRow
          checked={preferences.alwaysOnTop}
          label="Sempre no topo"
          onChange={(alwaysOnTop) => void onPreferencesChange({ alwaysOnTop })}
        />
        <SwitchRow
          checked={preferences.startMinimized}
          label="Iniciar na bandeja"
          onChange={(startMinimized) => void onPreferencesChange({ startMinimized })}
        />
        <SwitchRow
          checked={preferences.startWithWindows}
          label="Iniciar com Windows"
          onChange={(startWithWindows) => void onPreferencesChange({ startWithWindows })}
        />
      </div>

      <div className="settings-actions">
        <button className="text-button" type="button" onClick={onReload} disabled={busyAction !== null}>
          <RefreshCw size={16} />
          Recarregar
        </button>
        <button className="text-button danger" type="button" onClick={onClearSession} disabled={busyAction !== null}>
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
  )
}

// Copiar SegmentedControl e SwitchRow de App.tsx
// (ou extrair para arquivo próprio shared — ver Passo 3)

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

export default SettingsPanel
```

### Passo 2 — Refatorar `App.tsx` para usar `React.lazy`

Imports no topo:

```tsx
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'

const SettingsPanel = lazy(() => import('./SettingsPanel'))
```

Remover imports do `App.tsx` que só `SettingsPanel` usa:
- `LogOut`, `Maximize2`, `Moon`, `Power`, `Sun` (ainda usados? `RefreshCw` sim, `Settings` sim, `CheckCircle2` sim no status badge).
- `DEFAULT_PREFERENCES` (ainda usado no state inicial).
- `themeOptions`, `chatFormatOptions` (mover para SettingsPanel).
- `SegmentedControl`, `SwitchRow` (mover).

No JSX, substituir bloco inline por:

```tsx
{settingsOpen && (
  <Suspense fallback={null}>
    <SettingsPanel
      preferences={preferences}
      busyAction={busyAction}
      onPreferencesChange={setPreferences}
      onReload={reloadWhatsApp}
      onClearSession={clearSession}
    />
  </Suspense>
)}
```

### Passo 3 — Avaliar extrair `SegmentedControl` e `SwitchRow` para shared

Se `App.tsx` ainda usa esses componentes fora do painel, extrair para `src/renderer/src/components/SegmentedControl.tsx` e `SwitchRow.tsx` para evitar duplicação.

Hoje só `SettingsPanel` usa → mover junto manter é ok.

## Verificação

- [ ] Abrir app → painel Config não visível → DevTools Network mostra que `SettingsPanel` não foi carregado (chunk separado).
- [ ] Clicar em Configurações → chunk `SettingsPanel-*.js` carrega (~30ms em rede local).
- [ ] Painel renderiza idêntico ao anterior.
- [ ] Tema, formato, switches, botões — todos funcionais.
- [ ] Comparar `out/renderer/assets/index-*.js` antes/depois do refactor — deve ser menor.
- [ ] `npm run typecheck` sem erros.

## Riscos

- **Flash de loading:** `Suspense fallback={null}` evita placeholder visível. Avaliar se prefallback spinner — para painel pequeno, null é melhor.
- **Typecheck com `exactOptionalPropertyTypes` (Spec 08):** Props opcionais podem reclamar. Mitigação: deixar todas as props obrigatórias (já são).
- **Vite code-splitting em Electron:** Vite tsc lida com `import()` dinâmico. Electron main process não limita. Funciona out of the box.
