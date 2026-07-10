# Plan 07 — Content-Security-Policy refinada

**Spec de referência:** `docs/spec-07-csp-refined.md`
**Prioridade:** P2 — Alta
**Esforço total:** ~20min

## Tarefas

- [ ] **T1** — Atualizar meta CSP em `src/renderer/index.html` com: `img-src 'self' data: blob:`, `media-src 'none'`, `frame-src 'none'`, `form-action 'self'`, `worker-src 'self'`
- [ ] **T2** — Manter `connect-src` com localhost para dev (HMR Vite)
- [ ] **T3** — Adicionar headers `X-Content-Type-Options: nosniff` e `X-Frame-Options: DENY` em `onHeadersReceived` do `SessionManager` para origem WhatsApp
- [ ] **T4** — Integrar com Spec 06 (único handler `onHeadersReceived`) — ver `plan-06-cache-aggressive.md`
- [ ] **T5** — Rodar `npm run typecheck`
- [ ] **T6** — Teste manual: validar DevTools Console sem erros de CSP no renderer
- [ ] **T7** — Teste manual: validar HMR funciona em dev
- [ ] **T8** — Teste manual: inspecionar `BrowserView` do WhatsApp via `--remote-debugging-port` e confirmar headers presentes

## Ordem de execução

T1 → T2 → T3 → T4 (coordenar com Plan 06) → T5 → T6 → T7 → T8

## Arquivos a modificar

- `src/renderer/index.html` (T1, T2)
- `src/main/services/session-manager.ts` (T3, T4)

## Critério de aceite

- DevTools Console sem erros de CSP no renderer do BitWhat
- HMR do Vite funciona em dev
- BrowserView do WhatsApp recebe `X-Content-Type-Options` e `X-Frame-Options`
- `npm run typecheck` sem erros

## Dependência

- T4共享 com Plan 06 — implementar Specs 06 e 07 num único `onHeadersReceived` para evitar sobrescrita.
