# Plan 12 — Lazy loading do painel de configurações

**Spec de referência:** `docs/spec-12-lazy-settings-panel.md`
**Prioridade:** P3 — Média
**Esforço total:** ~30min

## Tarefas

- [ ] **T1** — Criar `src/renderer/src/SettingsPanel.tsx` com componente extrído de `App.tsx` (linhas 190–248 + `SegmentedControl` + `SwitchRow`)
- [ ] **T2** — Definir interface `SettingsPanelProps` com `preferences`, `busyAction`, `onPreferencesChange`, `onReload`, `onClearSession`
- [ ] **T3** — Exportar `SettingsPanel` como `default` (necessário para `React.lazy`)
- [ ] **T4** — Em `App.tsx`, importar `lazy` e `Suspense` do React
- [ ] **T5** — Declarar `const SettingsPanel = lazy(() => import('./SettingsPanel'))`
- [ ] **T6** — Substituir bloco inline `{settingsOpen && (...)}` por `{settingsOpen && (<Suspense fallback={null}><SettingsPanel ... /></Suspense>)}`
- [ ] **T7** — Remover imports não utilizados em `App.tsx` (`LogOut`, `Maximize2`, `Moon`, `Power`, `Sun`, `themeOptions`, `chatFormatOptions`)
- [ ] **T8** — Garantir que `RefreshCw`, `Settings`, `CheckCircle2`, `Loader2`, `TriangleAlert`, `PanelLeftClose`, `Pin`, `MessageCircle` ficam (ainda usados no topbar/status)
- [ ] **T9** — Rodar `npm run typecheck`
- [ ] **T10** — Rodar `npm run build` e validar que chunk separado `SettingsPanel-*.js` foi gerado em `out/renderer/assets/`
- [ ] **T11** — Teste manual: abrir app, validar que `SettingsPanel` não carregou no Network
- [ ] **T12** — Teste manual: clicar em Configurações, validar chunk carrega e painel renderiza idêntico
- [ ] **T13** — Teste manual: validar todas as ações do painel (trocar tema, formato, switches, recarregar, limpar sessão, ocultar, sair)

## Ordem de execução

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13

## Arquivos a criar

- `src/renderer/src/SettingsPanel.tsx` (T1–T3)

## Arquivos a modificar

- `src/renderer/src/App.tsx` (T4–T8)

## Critério de aceite

- `SettingsPanel-*.js` gerado como chunk separado
- Painel não carregado no startup (Network tab)
- Ao clicar Configurações, chunk carrega (~30ms) e painel renderiza
- Visual e funcionalidades idênticos ao anterior
- Sem flicker visível (fallback null)
- `npm run typecheck` sem erros
- `npm run build` sucesso

## Nota

Se Spec 08 (`exactOptionalPropertyTypes`) estiver ativa, garantir que todas as props de `SettingsPanelProps` são obrigatórias (já são neste plano).
