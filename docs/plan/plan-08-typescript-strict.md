# Plan 08 — TypeScript strict + flags adicionais

**Spec de referência:** `docs/spec-08-typescript-strict.md`
**Prioridade:** P3 — Média
**Esforço total:** ~1h (varia conforme erros)

## Tarefas

- [ ] **T1** — Ativar `noUncheckedIndexedAccess: true` em `tsconfig.json`
- [ ] **T2** — Rodar `npm run typecheck` e catalogar erros
- [ ] **T3** — Corrigir erros de `noUncheckedIndexedAccess` (provavelmente em `session-manager.ts`, `settings-store.ts`)
- [ ] **T4** — Re-rodar `npm run typecheck` até zero erros
- [ ] **T5** — Ativar `noPropertyAccessFromIndexSignature: true`
- [ ] **T6** — Rodar `npm run typecheck` e corrigir erros (provável `settings-store.ts` com casts `(input as { ... })`)
- [ ] **T7** — Ativar `exactOptionalPropertyTypes: true`
- [ ] **T8** — Rodar `npm run typecheck` e corrigir erros (possível `WhatsAppStatus.detail`, props React)
- [ ] **T9** — Validar `npm run build` (inclui typecheck)
- [ ] **T10** — Validar `npm run dev` — app abre sem regressão
- [ ] **T11** — Garantir que nenhum `@ts-ignore`/`@ts-expect-error` foi adicionado

## Ordem de execução

Ativar uma flag por vez para isolar erros:
T1 → T2 → T3 → T4 → T5 → T6 → T4 → T7 → T8 → T4 → T9 → T10 → T11

## Arquivos a modificar

- `tsconfig.json` (T1, T5, T7)
- Quaisquer `.ts`/`.tsx` que falharem typecheck (T3, T6, T8)

## Critério de aceite

- `npm run typecheck` zero erros
- `npm run build` sucesso
- `npm run dev` app abre normalmente
- Nenhum `@ts-ignore`/`@ts-expect-error` adicionado
- Runtime inalterado

## Plano de contingência

Se T3/T6/T8 gerar >30 erros e esforço passar de 2h:
- Manter apenas `noUncheckedIndexedAccess` (T1–T4)
- Adiar `noPropertyAccessFromIndexSignature` e `exactOptionalPropertyTypes` para sprint seguinte
