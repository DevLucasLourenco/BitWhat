# Spec 08 — TypeScript strict + flags adicionais

**Prioridade:** P3 — Média
**Esforço estimado:** ~1h (depende de quantos erros surgirem)
**Arquivos afetados:** `tsconfig.json`, todos os `.ts`/`.tsx` que falharem typecheck

## Contexto

`tsconfig.json` já tem `strict: true` (linha 10). Mas há flags adicionais que pegam bugs subtis em tempo de compilação:

- `noUncheckedIndexedAccess` — acesso a `array[i]` retorna `T | undefined` em vez de `T`.
- `exactOptionalPropertyTypes` — proíbe `undefined` explícito em props opcionais.
- `noPropertyAccessFromIndexSignature` — força acesso via `['key']` em tipos indexados.

## Objetivo

Ativar essas flags para pegar bugs em tempo de compilação, especialmente em:
- Acesso a índices de array em `navigation-guard.ts`, `whatsapp-panel-mode.ts` (script injetado).
- Props opcionais em `WhatsAppStatus.detail` (pode ser undefined).

## Requisitos funcionais

1. Ativar as 3 flags em `tsconfig.json`.
2. Rodar `npm run typecheck` e corrigir todos os erros.
3. Não introduzir `// @ts-ignore` ou `// @ts-expect-error` — corrigir de raiz.
4. Backward-compatible: não mudar comportamento runtime, apenas checagem mais rígida.

## Requisitos não funcionais

- Se uma flag gerar mais de ~30 erros e o esforço de correção passar de 2h, splitar: ativar `noUncheckedIndexedAccess` primeiro, depois `exactOptionalPropertyTypes`, depois `noPropertyAccessFromIndexSignature`.
- Não desativar `skipLibCheck` (libs de terceiros podem ter tipos imperfeitos).

## Plano de implementação

### Passo 1 — Atualizar `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["node", "vite/client"]
  },
  "include": [
    "electron.vite.config.ts",
    "src/**/*.ts",
    "src/**/*.tsx"
  ]
}
```

### Passo 2 — Rodar typecheck e listar erros

```bash
npm run typecheck 2>&1 | tee /tmp/ts-errors.txt
```

### Passo 3 — Corrigir erros por arquivo

Áreas prováveis de erro:

#### `whatsapp-panel-mode.ts` (script injetado como string)
A string `createEnableWhatsAppPanelScript` não é tipada pelo TS (é template string). Não há erros esperados aqui a menos que usemos Tagged Templates — não usamos. Pass.

#### `session-manager.ts`

```ts
// Linha ~12: ALLOWED_PERMISSIONS.has(permission) — Set<string>.has() é ok.
// Linha ~48-50: details.requestingUrl || webContents.getURL() — webContents pode ser null
```

Provável correção:
```ts
const requestingUrl = details.requestingUrl ?? webContents?.getURL() ?? WHATSAPP_ORIGIN
```

#### `settings-store.ts`

```ts
// Linha ~107-129: (input as { whatsappPanel?: unknown }).whatsappPanel — acesso indexado
// noPropertyAccessFromIndexSignature pode reclamar
```

Correção: usar asserção de tipo ou `Record<string, unknown>` com acesso `['key']`.

#### `window-manager.ts`

```ts
// Linha ~370: state.hasChatList — Se adicionar noUncheckedIndexedAccess, nada muda aqui.
// Mas se validarmos response JSON, indices podem ser undefined.
```

#### `App.tsx`

```ts
// themeOptions[0].value — noUncheckedIndexedAccess torna `ThemePreference | undefined`
// Já iterado com .map(), não acessado por índice direto. Pass.
```

### Passo 4 — Re-rodar typecheck

```bash
npm run typecheck
```

Repetir Passo 3 até zero erros.

### Passo 5 — Validar build

```bash
npm run build
```

Confirma que não quebra produção (Vite usa esbuild, que respeita tsconfig?)

Na verdade, `npm run build` chama `npm run typecheck` antes de `electron-vite build`. Se typecheck passar, build passa.

## Verificação

- [ ] `npm run typecheck` — zero erros.
- [ ] `npm run build` — sucesso.
- [ ] `npm run dev` — app abre normalmente.
- [ ] Nenhum `@ts-ignore` ou `@ts-expect-error` adicionado.
- [ ] Runtime inalterado (abrir app, logar, enviar msg, recarregar, sair).

## Riscos

- **Muitos erros em código legado:** Se >50 erros, pode não valer o esforço agora. Avaliar split gradual: ativar 1 flag por PR.
- **`exactOptionalPropertyTypes` pode impactar props React:** `App.tsx` e `SettingsPanel` (se extraído em Spec 12) usam props opcionais. Ex: `WhatsAppStatus.detail?: string`. Passar `detail: undefined` explícito passaria a falhar. Mitigação: omitir a chave ao invés de setar undefined.

## Ordem recomendada de ativação (se splitar)

1. `noUncheckedIndexedAccess` — mais valor, erros previsíveis em arrays de strings.
2. `noPropertyAccessFromIndexSignature` — poucos erros esperados, baixo esforço.
3. `exactOptionalPropertyTypes` — mais intrusivo, pode requerer refactor em types.
