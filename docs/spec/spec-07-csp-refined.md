# Spec 07 — Content-Security-Policy refinada

**Prioridade:** P2 — Alta
**Esforço estimado:** ~20min
**Arquivos afetados:** `src/renderer/index.html`, `src/main/services/session-manager.ts`

## Contexto

A CSP atual (`renderer/index.html:6-8`) é genérica:

```html
content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
     img-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:*;
     font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
```

Problemas:
- `connect-src` permite `http://localhost:*` em produção (só dev precisa).
- `media-src` não especificado → cai em `default-src 'self'` (aceitável, mas explícito é melhor).
- `frame-src` não bloqueado explicitamente.
- `worker-src` / `child-src` não especificados.
- Sem CSP para o `BrowserView` do WhatsApp como defesa adicional.

## Objetivo

1. CSP mais restritiva no renderer (UI do BitWhat).
2. CSP explícita via header HTTP para o `BrowserView` do WhatsApp como defesa em profundidade (mesmo que WhatsApp Web já tenha CSP própria).

## Requisitos funcionais

### Renderer (UI BitWhat) — nova CSP:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
media-src 'none';
connect-src 'self' https://web.whatsapp.com wss://web.whatsapp.com http://localhost:* ws://localhost:*;
font-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-src 'none';
frame-ancestors 'none';
worker-src 'self';
```

Diferenças vs atual:
- `img-src` adiciona `blob:` (necessário para algumas APIs de imagem).
- `media-src 'none'` explícito (UI BitWhat não toca áudio/vídeo).
- `frame-src 'none'` (Bloqueia iframes).
- `form-action 'self'` (previne form posting externo).
- `worker-src 'self'` (explícito).

### BrowserView WhatsApp — CSP duas camadas:

Manter CSP do WhatsApp Web (não sobrescrever). Apenas adicionar `X-Content-Type-Options: nosniff` e `X-Frame-Options: DENY` em todas as respostas do WhatsApp como defesa.

## Requisitos não funcionais

- Em desenvolvimento (`ELECTRON_RENDERER_URL` definido), `connect-src` deve permitir `http://localhost:*` para HMR do Vite.
- Em produção, remover localhost de `connect-src` se possível (avaliar se Vite usa WS em produção — não usa).
- Não quebrar emojis/avatares do WhatsApp Web (eles vêm do `BrowserView`, não do renderer do BitWhat).

## Plano de implementação

### Passo 1 — Atualizar CSP em `renderer/index.html`

Substituir linha 6-8:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'none'; connect-src 'self' https://web.whatsapp.com wss://web.whatsapp.com http://localhost:* ws://localhost:*; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; worker-src 'self';"
/>
```

### Passo 2 — CSP condicional dev vs prod (opcional)

Se quisermos eliminar `localhost` em produção, usar variável de ambiente do Vite:

```html
content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:; media-src 'none';
  connect-src 'self' https://web.whatsapp.com wss://web.whatsapp.com %VITE_CSP_CONNECT_EXTRA%;
  font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
  frame-src 'none'; frame-ancestors 'none'; worker-src 'self';"
/>
```

Em `electron.vite.config.ts`, definir `VITE_CSP_CONNECT_EXTRA`:
- Dev: `http://localhost:* ws://localhost:*`
- Prod: string vazia.

Avaliar se complexidade vale a pena — para o MVP, manter localhost em produção é baixo risco. Deixar simples (Passo 1) e revisar depois.

### Passo 3 — Headers de defesa no `BrowserView` do WhatsApp

Em `session-manager.ts`, dentro de `configure()`, adicionar:

```ts
this.whatsappSession.webRequest.onHeadersReceived((details, callback) => {
  // ❗ Conflito com Spec 06 — integrar num único handler
  const responseHeaders = { ...details.responseHeaders }

  // Spec 06: cache agressivo de estáticos
  // (ver spec-06-cache-aggressive.md)

  // Spec 07: defesa em profundidade
  if (isWhatsAppOrigin(details.url)) {
    responseHeaders['X-Content-Type-Options'] = ['nosniff']
    responseHeaders['X-Frame-Options'] = ['DENY']
  }

  callback({ responseHeaders })
})
```

**Atenção:** Spec 06 e Spec 07 mexem no mesmo `onHeadersReceived`. Implementar juntos num único handler para evitar conflito. Se implementadas separadamente, o segundo `onHeadersReceived` sobrescreve o primeiro.

### Passo 4 — Integrar Spec 06 + 07 num único handler

Em `session-manager.ts:configure()`:

```ts
const STATIC_RESOURCE_TYPES = new Set(['stylesheet', 'script', 'image', 'font'])
const CACHEABLE_CACHE_CONTROL = 'public, max-age=86400, immutable'

this.whatsappSession.webRequest.onHeadersReceived((details, callback) => {
  const responseHeaders = { ...details.responseHeaders }

  if (isWhatsAppOrigin(details.url) || this.isCacheableOrigin(details.url)) {
    // Spec 07: defesa em profundidade (só para whatsapp.com, não CDN)
    if (isWhatsAppOrigin(details.url)) {
      responseHeaders['X-Content-Type-Options'] = ['nosniff']
      responseHeaders['X-Frame-Options'] = ['DENY']
    }

    // Spec 06: cache agressivo de estáticos
    if (STATIC_RESOURCE_TYPES.has(details.resourceType)) {
      const existing = responseHeaders['Cache-Control'] ?? responseHeaders['cache-control']
      const existingValue = Array.isArray(existing) ? existing.join(', ') : existing

      if (!existingValue || !/no-store|no-cache/i.test(existingValue)) {
        responseHeaders['Cache-Control'] = [CACHEABLE_CACHE_CONTROL]
      }
    }
  }

  callback({ responseHeaders })
})
```

## Verificação

- [ ] Abrir DevTools no renderer do BitWhat → Console sem erros de CSP.
- [ ] Carregar app em dev → HMR do Vite funciona (WebSocket em localhost).
- [ ] Tentar injetar iframe via Console (não há console no renderer, mas via preload em dev) → bloqueado por `frame-src 'none'`.
- [ ] Inspecionar `BrowserView` do WhatsApp via `--remote-debugging-port` → headers `X-Content-Type-Options` e `X-Frame-Options` presentes em respostas do WhatsApp.
- [ ] Recursos estáticos (CSS/JS) do WhatsApp recebem `Cache-Control: immutable` (Spec 06).
- [ ] `npm run typecheck` sem erros.

## Riscos

- **HMR quebrado em dev:** Se `connect-src` não permitir `ws://localhost:*`, recarregamento automático do Vite falha. Mitigação: manter localhost na CSP para dev.
- **WhatsApp Web interno quebra:** Não alteramos CSP do WhatsApp Web em si, apenas adicionamos headers. WhatsApp já tem CSP própria e não frame-nos.
- **Conflito Spec 06/07:** Implementar num único `onHeadersReceived` (Passo 4) resolve.
