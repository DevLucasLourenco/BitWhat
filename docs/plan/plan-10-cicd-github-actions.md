# Plan 10 — CI/CD GitHub Actions

**Spec de referência:** `docs/spec-10-cicd-github-actions.md`
**Prioridade:** P3 — Média
**Esforço total:** ~45min

## Tarefas

- [ ] **T1** — Criar `.github/workflows/` directory
- [ ] **T2** — Criar `.github/workflows/build.yml` com triggers `push` (main), `pull_request` (main), tags `v*`
- [ ] **T3** — Step: Checkout com `fetch-depth: 0`
- [ ] **T4** — Step: Setup Node 22 com `cache: npm`
- [ ] **T5** — Step: `npm ci` (validar que `package-lock.json` está atualizado localmente)
- [ ] **T6** — Step: `npm run typecheck`
- [ ] **T7** — Step: `npm run build:win` com `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
- [ ] **T8** — Step (condicional `push main`): Upload artifact `BitWhat-windows-<sha>` com retention 14 dias
- [ ] **T9** — Step (condicional `tag v*`): Publish GitHub Release com `electron-builder --publish always` ou `softprops/action-gh-release@v2`
- [ ] **T10** — Validar que `postinstall` (`npm run icons`) funciona no runner Windows
- [ ] **T11** — Commit e push para `main` → validar workflow larga e artifact gerado
- [ ] **T12** — Criar tag fake `v0.1.1-test` e push → validar Release criado
- [ ] **T13** — Limpar tag/Release de teste

## Ordem de execução

T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13

## Arquivos a criar

- `.github/workflows/build.yml` (T2–T9)

## Critério de aceite

- Push em `main` dispara build, artifact disponível na aba Actions
- PR dispara build sem artifact (validação only)
- Tag `v*` publica Release no GitHub com `.exe` anexado
- Build completa em <10min
- Logs não expõem tokens

## Pré-requisitos

- Repo precisa estar no GitHub (não Bitbucket/GitLab)
- `package-lock.json` commitado (senão `npm ci` falha)
- `scripts/generate-icons.mjs` funciona em runner Windows sem dep adicional
