// Tela de login (QR Code) com a identidade do BitWhat.
//
// A página de login do WhatsApp Web foi feita para telas largas: na janela
// compacta do BitWhat o QR fica cortado à direita. Enquanto o QR estiver na
// página, uma camada do BitWhat cobre a tela (logo, nome e instruções) e o
// elemento real do QR (`[data-ref]`) é fixado sobre o card central. O QR
// continua sendo o do próprio WhatsApp: nada é copiado nem lido dele.
//
// Quando o QR some (login concluído ou fluxo "número de telefone"), a camada é
// removida. Após o login o observador é desligado.

export const WHATSAPP_LOGIN_CSS = `
#bitwhat-login {
  --bw-surface: #111827;
  --bw-card: #17212f;
  --bw-text: #eef5f3;
  --bw-muted: #a7b6b2;
  --bw-accent: #41c7aa;
  --bw-border: #314154;
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: none;
  flex-direction: column;
  align-items: center;
  /* "safe": em janelas baixas o conteúdo rola em vez de ser cortado no topo. */
  justify-content: safe center;
  gap: 14px;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
  background: var(--bw-surface);
  color: var(--bw-text);
  font-family: "Segoe UI", system-ui, sans-serif;
  text-align: center;
}

@media (prefers-color-scheme: light) {
  #bitwhat-login {
    --bw-surface: #f7faf9;
    --bw-card: #ffffff;
    --bw-text: #17211f;
    --bw-muted: #5c6b66;
    --bw-accent: #0f766e;
    --bw-border: #dbe4e1;
  }
}

html[data-bitwhat-login="true"] #bitwhat-login {
  display: flex;
}

#bitwhat-login .bw-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

#bitwhat-login .bw-brand svg {
  width: 40px;
  height: 40px;
  flex: none;
}

#bitwhat-login .bw-name {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

#bitwhat-login .bw-name b {
  color: var(--bw-accent);
  font-weight: 700;
}

#bitwhat-login .bw-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

#bitwhat-login .bw-qr-slot {
  flex: none;
  box-sizing: border-box;
  width: 252px;
  height: 252px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid var(--bw-border);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--bw-accent) 35%, transparent);
}

#bitwhat-login .bw-steps {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--bw-muted);
}

#bitwhat-login .bw-steps strong {
  color: var(--bw-text);
  font-weight: 600;
}

#bitwhat-login .bw-phone {
  border: 0;
  padding: 4px 8px;
  background: none;
  color: var(--bw-accent);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

html[data-bitwhat-login="true"] [data-bitwhat-lift="true"] {
  z-index: auto !important;
  transform: none !important;
  filter: none !important;
  backdrop-filter: none !important;
  opacity: 1 !important;
  will-change: auto !important;
  contain: none !important;
  isolation: auto !important;
}

html[data-bitwhat-login="true"] [data-bitwhat-qr="true"] {
  position: fixed !important;
  z-index: 2147483001 !important;
  margin: 0 !important;
  transform: none !important;
}
`

export function createWhatsAppLoginScreenScript(): string {
  return `
(() => {
  const stateKey = '__bitWhatLogin';
  if (window[stateKey]) {
    window[stateKey].sync();
    return;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PHONE_LOGIN_PATTERN = /n[uú]mero de telefone|phone number/i;
  const root = document.documentElement;
  let overlay = null;
  let slot = null;
  let currentQr = null;
  let frame = 0;

  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const buildLogo = () => {
    const svg = svgEl('svg', { viewBox: '0 0 256 256', 'aria-hidden': 'true' });
    svg.append(
      svgEl('rect', { width: '256', height: '256', rx: '46', fill: '#0f766e' }),
      svgEl('rect', { x: '44', y: '44', width: '168', height: '150', rx: '36', fill: '#f5faf7' }),
      svgEl('path', { d: 'M82 168 69 216l48-27Z', fill: '#f5faf7' }),
      svgEl('path', {
        d: 'm82 106 27 48 65-72',
        fill: 'none',
        stroke: '#0d765e',
        'stroke-width': '18',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      })
    );
    return svg;
  };

  const findPhoneLoginButton = () =>
    Array.from(document.querySelectorAll('[role="button"], button, a, span'))
      .filter((node) => !overlay?.contains(node))
      .find((node) => PHONE_LOGIN_PATTERN.test(node.textContent || '') && (node.textContent || '').length < 80);

  const buildOverlay = () => {
    overlay = el('div');
    overlay.id = 'bitwhat-login';

    const brand = el('div', 'bw-brand');
    const name = el('span', 'bw-name', 'Bit');
    name.append(el('b', '', 'What'));
    brand.append(buildLogo(), name);

    slot = el('div', 'bw-qr-slot');

    const steps = el('p', 'bw-steps');
    steps.append(
      'No celular, abra o WhatsApp e toque em ',
      el('strong', '', 'Dispositivos conectados'),
      ' › ',
      el('strong', '', 'Conectar dispositivo'),
      '.'
    );

    const phone = el('button', 'bw-phone', 'Entrar com número de telefone');
    phone.type = 'button';
    phone.addEventListener('click', () => findPhoneLoginButton()?.click());

    overlay.append(brand, el('p', 'bw-title', 'Escaneie o QR Code para entrar'), slot, steps, phone);
    overlay.addEventListener('scroll', schedule, { passive: true });
    document.body.append(overlay);
  };

  const placeQr = () => {
    if (!currentQr || !slot) return;
    const slotRect = slot.getBoundingClientRect();
    const qrRect = currentQr.getBoundingClientRect();
    const top = slotRect.top + (slotRect.height - qrRect.height) / 2;
    const left = slotRect.left + (slotRect.width - qrRect.width) / 2;
    currentQr.style.setProperty('top', Math.round(top) + 'px', 'important');
    currentQr.style.setProperty('left', Math.round(left) + 'px', 'important');
  };

  // Um ancestral do QR com z-index (ou transform/filter) cria um contexto de
  // empilhamento que o prende atrás da camada; durante o login ele é neutralizado.
  const liftAncestors = (qr) => {
    for (let node = qr.parentElement; node && node !== document.body; node = node.parentElement) {
      node.setAttribute('data-bitwhat-lift', 'true');
    }
  };

  const releaseQr = () => {
    document.querySelectorAll('[data-bitwhat-lift]').forEach((node) => node.removeAttribute('data-bitwhat-lift'));
    if (!currentQr) return;
    currentQr.removeAttribute('data-bitwhat-qr');
    currentQr.style.removeProperty('top');
    currentQr.style.removeProperty('left');
    currentQr = null;
  };

  const sync = () => {
    frame = 0;
    if (!document.body) return;

    if (document.querySelector('#pane-side, [data-testid="chat-list"]')) {
      root.removeAttribute('data-bitwhat-login');
      releaseQr();
      overlay?.remove();
      overlay = null;
      slot = null;
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      delete window[stateKey];
      return;
    }

    const qr = document.querySelector('[data-ref]');
    if (!qr) {
      root.removeAttribute('data-bitwhat-login');
      releaseQr();
      return;
    }

    if (!overlay || !overlay.isConnected) buildOverlay();
    if (qr !== currentQr) {
      releaseQr();
      currentQr = qr;
      qr.setAttribute('data-bitwhat-qr', 'true');
      liftAncestors(qr);
    }

    root.setAttribute('data-bitwhat-login', 'true');
    placeQr();
  };

  function schedule() {
    if (!frame) frame = requestAnimationFrame(sync);
  }

  const observer = new MutationObserver(schedule);
  // O WhatsApp cria o contêiner antes e só depois grava o atributo data-ref nele.
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ref'] });
  window.addEventListener('resize', schedule);
  window[stateKey] = { sync: schedule };
  sync();
})()
`
}
