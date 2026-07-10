# Spec 06 — Cache agressivo de assets do WhatsApp Web

**Prioridade:** P2 — Alta
**Esforço estimado:** ~30min
**Arquivos afetados:** `src/main/services/session-manager.ts`

## Contexto

Cada vez que o WhatsApp Web recarrega, revalida todos os recursos estáticos (JS, CSS, fontes, imagens) com o servidor. Em redes lentas ou com flutuação de conexão, isso adiciona segundos ao carregamento. O Electron já tem cache em disco, mas os headers `Cache-Control` do WhatsApp Web nem sempre são `immutable`.

## Objetivo

Forçar `Cache-Control: max-age=86400, immutable` em recursos estáticos do WhatsApp Web para reduzir revalidação e acelerar carregamentos subsequentes.

## Requisitos funcionais

1. Interceptar headers de resposta em `session.webRequest.onHeadersReceived`.
2. Aplicar `Cache-Control: public, max-age=86400, immutable` para recursos estáticos: `stylesheet`, `script`, `image`, `font`.
3. Não aplicar a `xhr`/`fetch` (API dinâmica do WhatsApp — dados de mensagens) nem `mainFrame`/`subFrame` (HTML).
4. Limitar a URLs cuja origem é `https://web.whatsapp.com` ou subdomínios do WhatsApp (CDNs `*.whatsapp.net`, `*.fbcdn.net`).

## Requisitos não funcionais

- Não aumentar latência da primeira carga — apenas alterar header de resposta.
- Se o servidor já enviar `Cache-Control: no-store`, respeitar e não sobrescrever (pode ser intencional).
- Logging mínimo — não logar cada request (volume alto), apenas se algo falhar.

## Plano de implementação

### Passo 1 — `session-manager.ts`: adicionar filtro em `configure()`

Após o bloco `onBeforeSendHeaders` existente (linha ~31-46), adicionar:

```ts
const STATIC_RESOURCE_TYPES = new Set(['stylesheet', 'script', 'image', 'font'])
const CACHEABLE_CACHE_CONTROL = 'public, max-age=86400, immutable'

this.whatsappSession.webRequest.onHeadersReceived((details, callback) => {
  const responseHeaders = { ...details.responseHeaders }
  const resourceType = details.resourceType

  if (STATIC_RESOURCE_TYPES.has(resourceType) && this.isCacheableOrigin(details.url)) {
    const existing = responseHeaders['Cache-Control'] ?? responseHeaders['cache-control']
    const existingValue = Array.isArray(existing) ? existing.join(', ') : existing

    if (existingValue && /no-store|no-cache/i.test(existingValue)) {
      callback({ responseHeaders })
      return
    }

    responseHeaders['Cache-Control'] = [CACHEABLE_CACHE_CONTROL]
  }

  callback({ responseHeaders })
})
```

### Passo 2 — Helper `isCacheableOrigin(url)`

```ts
private isCacheableOrigin(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    const hostname = url.hostname.toLowerCase()
    return (
      hostname === 'web.whatsapp.com' ||
      hostname.endsWith('.whatsapp.com') ||
      hostname.endsWith('.whatsapp.net') ||
      hostname.endsWith('.fbcdn.net')
    )
  } catch {
    return false
  }
}
```

### Passo 3 — Importar `isWhatsAppOrigin` existente

Já importado em `session-manager.ts:9` via `navigation-guard.ts`. Reusar para validar origem do request, mas precisamos de lista mais ampla (inclui CDNs do Facebook). Manter helper separado.

## Verificação

- [ ] Abrir app fresh (cache limpo) → carregar WhatsApp → fechar.
- [ ] Reabrir e recarregar → DevTools do Electron deve mostrar `(disk cache)` em recursos estáticos no Network.
- [ ] TMP: ativar `--remote-debugging-port=9229` no main para inspecionar network do BrowserView.
- [ ] Verificar que `xhr` e `mainFrame` não receberam `Cache-Control` modificado.
- [ ] Volume de tráfego de rede ao recarregar deve cair >50% após primeiro carregamento.
- [ ] `npm run typecheck` sem erros.

## Riscos

- **Quebrar rollout/feature flags:** WhatsApp pode servir JS com URLs versionadas (`app.abc123.js`) — cache immutable é seguro. Se servidor servir `app.js` sem versionar, nosso override pode impedir update. Mitigação: WhatsApp Web usa hashing em URLs (`web.whatsapp.com/r/app.abc.js`), então `immutable` é correto.
- **CDN fbcdn.net não-WhatsApp:** Esse domínio serve mídia do Facebook/Instagram também. Se o usuário estiver logado em outro app FB no mesmo Electron (não é o caso, nossa partition é isolada), não há impacto. Mesmo assim, limitar a `stylesheet|script|image|font` reduz risco.
- **Conflito com `onHeadersReceived` existente:** Não há handler `onHeadersReceived` hoje, então não há conflito.
