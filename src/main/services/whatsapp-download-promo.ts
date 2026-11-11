// Esconde o aviso "Baixar o WhatsApp para Windows" / "Use o app para acessar o
// histórico..." que o WhatsApp Web insere em momentos variados (busca, lista,
// conversa). Um observador da página age sempre que o aviso surge: a partir do
// texto, sobe até o maior bloco que contém só o aviso (sem lista, conversa ou
// campo de texto) e o esconde por CSS. Nada é removido do documento.

export const WHATSAPP_DOWNLOAD_PROMO_CSS = `
[data-bitwhat-download-promo="true"] {
  display: none !important;
}
`

export function createWhatsAppDownloadPromoScript(): string {
  return `
(() => {
  const stateKey = '__bitWhatDownloadPromo';
  if (window[stateKey]) {
    window[stateKey].scan(document.body);
    return;
  }

  const PROMO_PATTERN = /baix(ar|e) o whatsapp para (o )?windows|use o app para acessar|download whatsapp for windows|get (the )?whatsapp (app )?for windows|use the app to access/i;
  const QUICK_PATTERN = /windows|use o app|use the app/i;
  const PROTECTED = '#pane-side, #main, [role="row"], [role="grid"], [role="listitem"], [contenteditable="true"], input, textarea, footer, [data-id], [data-bitwhat-chat-panel], #bitwhat-stage, #bitwhat-login';
  // Folga para o texto do botão/ícone além da frase do aviso.
  const MAX_EXTRA_TEXT = 140;

  const hidePromo = (textNode) => {
    let block = textNode.parentElement;
    if (!block || block.closest('[data-bitwhat-download-promo]')) {
      return;
    }

    const limit = (textNode.nodeValue || '').trim().length + MAX_EXTRA_TEXT;
    while (block.parentElement && block.parentElement !== document.body && block.parentElement.id !== 'app') {
      const parent = block.parentElement;
      if ((parent.textContent || '').trim().length > limit || parent.matches(PROTECTED) || parent.querySelector(PROTECTED)) {
        break;
      }
      block = parent;
    }

    if (block.matches(PROTECTED) || block.querySelector(PROTECTED)) {
      return;
    }
    block.setAttribute('data-bitwhat-download-promo', 'true');
  };

  const scan = (root) => {
    if (!root || !QUICK_PATTERN.test(root.textContent || '')) {
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (PROMO_PATTERN.test(node.nodeValue || '')) {
        hidePromo(node);
      }
    }
  };

  // O WhatsApp pode reaproveitar o mesmo nó para outro conteúdo: se o texto do
  // bloco marcado deixar de ser o aviso, ele volta a aparecer.
  const revalidate = () => {
    document.querySelectorAll('[data-bitwhat-download-promo]').forEach((block) => {
      if (!PROMO_PATTERN.test(block.textContent || '') || block.matches(PROTECTED) || block.querySelector(PROTECTED)) {
        block.removeAttribute('data-bitwhat-download-promo');
      }
    });
  };

  const observer = new MutationObserver((mutations) => {
    revalidate();
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        if (mutation.target.parentElement) {
          scan(mutation.target.parentElement);
        }
        continue;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scan(node);
        } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
          scan(node.parentElement);
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  window[stateKey] = { scan };
  scan(document.body);
})()
`
}
