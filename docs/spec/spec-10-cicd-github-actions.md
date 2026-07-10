# Spec 10 — CI/CD GitHub Actions — build automatizado

**Prioridade:** P3 — Média
**Esforço estimado:** ~45min
**Arquivos afetados:** novo `.github/workflows/build.yml`

## Contexto

Hoje o build do instalador Windows é feito manualmente com `npm run build:win`. Não há automação. Cada release exige rodar o comando na máquina dev, copiar o `.exe`, e fazer upload manual para o GitHub Releases.

## Objetivo

Pipeline CI/CD no GitHub Actions que:
1. Dispara em `push` para `main` e em PRs.
2. Roda typecheck.
3. Builda instalador Windows (`.exe` NSIS).
4. Upload do `.exe` como artifact (download temporário).
5. Em push de tag `v*`, publica release no GitHub automaticamente.

## Requisitos funcionais

1. **Trigger push:** typecheck + build + artifact (não publica release).
2. **Trigger PR:** typecheck + build (sem artifact, só valida).
3. **Trigger tag `v*`:** typecheck + build + publica GitHub Release com `.exe` anexado.
4. **Runner:** `windows-latest` (necessário para build Windows com electron-builder).
5. **Node:** 22 LTS (compatível com `engines: ">=20.18.0"`).
6. **Cache:** `setup-node` com `cache: npm` para acelerar builds.

## Requisitos não funcionais

- Tempo de build <10min em runner padrão.
- Não expor tokens em logs.
- Em caso de falha, notificar via commit status (automático do GH Actions).

## Plano de implementação

### Passo 1 — Criar `.github/workflows/build.yml`

```yaml
name: Build BitWhat

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: windows-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # necessário para electron-builder ler tags

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Build Windows installer
        run: npm run build:win
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload artifact
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: BitWhat-windows-${{ github.sha }}
          path: dist/BitWhat-*.exe
          retention-days: 14

      - name: Publish GitHub Release
        if: startsWith(github.ref, 'refs/tags/v')
        run: npx electron-builder --win nsis --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Passo 2 — Garantir que `npm ci` funciona

Verificar que `package-lock.json` está atualizado:

```bash
npm install  # regenera lock se necessário
git add package-lock.json
git commit -m "chore: refresh package-lock for CI"
```

### Passo 3 — `postinstall` no CI

`package.json` tem `"postinstall": "npm run icons"` (linha 20). No CI, `scripts/generate-icons.mjs` pode precisar de dependências de imagem. Verificar:

- Se `generate-icons.mjs` usa `sharp` ou canvas, adicionar como `devDependencies`.
- Se usa apenas manipulação de arquivos/JSON (caso atual), não há problema.

Validar localmente:

```bash
npm ci
npm run icons
```

### Passo 4 — Tag de release

Para disparar publish:

```bash
# Local
npm version patch
git push --follow-tags
```

GitHub Actions detecta `refs/tags/v0.1.1` e publica Release com `.exe` anexado.

### Passo 5 — `GITHUB_TOKEN` automático

`GITHUB_TOKEN` é injetado automaticamente pelo GH Actions (`secrets.GITHUB_TOKEN`). Não precisa criar PAT. Permissões default já permitem criar releases se o workflow rodar em push de tag.

Se precisar de permissões extras (escrever em releases de outro repo), usar PAT via `actions/create-github-app-token`.

### Passo 6 — Opcional: Release notes automáticas

Adicionar step para gerar changelog:

```yaml
- name: Generate release notes
  if: startsWith(github.ref, 'refs/tags/v')
  uses: softprops/action-gh-release@v2
  with:
    files: dist/BitWhat-*.exe
    generate_release_notes: true
```

Substitui o `npx electron-builder --publish always` (mais simples e flexível). Avaliar qual adotar.

## Verificação

- [ ] Fazer push para `main` → workflow roda, artifact `BitWhat-windows-<sha>` fica disponível na aba Actions.
- [ ] Abrir PR → workflow roda, sem artifact (apenas validação).
- [ ] Push de tag `v0.1.1` → Release "v0.1.1" criado no GitHub com `.exe` anexado.
- [ ] Build completa em <10min.
- [ ] Logs não expõem tokens.

## Riscos

- **Runner Windows mais lento/caro:** Runners Windows no GH Actions free tier limitam minutos. Para repo private, minutos Windows contam 2x. Avaliar se vale usar runner `ubuntu-latest` com cross-build (electron-builder suporta, mas pode falhar em code signing Windows). Mitigação: usar Windows runner só para publish de tag.
- **`postinstall` falha no CI:** Se `generate-icons.mjs` usar `sharp`, precisa de `npm ci` instalar tudo. Testar antes.
- **Tag sem bump de versão:** Se esquecer de bumpar `package.json`, release tem versão errada. Mitigação: `npm version` faz bump automático.

## Integração com Spec 09

Se Spec 09 (auto-updater) estiver implementada com `provider: github`, os releases gerados por este CI alimentam o auto-updater. Fluxo:
1. Dev faz `npm version patch && git push --tags`.
2. CI roda, builda, publica release no GitHub.
3. Apps instalados detectam update em até 6h (Spec 09) e baixam do mesmo release.
