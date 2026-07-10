# Plan 06 — Cache agressivo de assets do WhatsApp Web

**Spec de referência:** `docs/spec-06-cache-aggressive.md`
**Prioridade:** P2 — Alta
**Esforço total:** ~30min

## Tarefas

- [ ] **T1** — Definir constantes `STATIC_RESOURCE_TYPES` e `CACHEABLE_CACHE_CONTROL` no `SessionManager`
- [ ] **T2** — Implementar `isCacheableOrigin(url)` helper privado (whatsapp.com, whatsapp.net, fbcdn.net)
- [ ] **T3** — Adicionar handler `onHeadersReceived` em `configure()` que sobrescreve `Cache-Control` para estáticos cacheable
- [ ] **T4** — Respeitar `no-store`/`no-cache` existente sem sobrescrever
- [ ] **T5** — Integrar com Spec 07 (único handler `onHeadersReceived`) — ver `plan-07-csp-refined.md`
- [ ] **T6** — Rodar `npm run typecheck`
- [ ] **T7** — Teste manual: abrir app fresh, carregar WhatsApp, fechar, reabrir → DevTools Network deve mostrar `(disk cache)` nos estáticos
- [ ] **T8** — Teste manual: validar que `xhr`/`mainFrame` não receberam `Cache-Control` modificado

## Ordem de execução

T1 → T2 → T3 → T4 → T5 (coordenar com Plan 07) → T6 → T7 → T8

## Arquivos a modificar

- `src/main/services/session-manager.ts` (T1–T4)

## Critério de aceite

- Recursos estáticos (CSS/JS/fontes/imagens) recebem `Cache-Control: immutable`
- Recursos dinâmicos (`xhr`, `mainFrame`) não são modificados
- Tráfego de rede ao recarregar cai >50% após primeiro carregamento
- `npm run typecheck` sem erros

## Dependência

- Coordenar T5 com Plan 07 — implementar Specs 06 e 07 num único handler `onHeadersReceived` para evitar conflito.
