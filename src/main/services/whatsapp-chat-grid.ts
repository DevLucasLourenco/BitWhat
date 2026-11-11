// Lista de conversas em grade (cartões) — a "cara" do BitWhat.
//
// O WhatsApp desenha só as conversas visíveis: cada uma é um [role="row"]
// absoluto com translateY(i * alturaDaLinha) dentro de um [role="grid"] de
// altura n * alturaDaLinha, e a rolagem decide quais linhas existem.
// Aqui cada linha vira um cartão na coluna (i % C) e na faixa floor(i / C), com
// altura C * alturaDaLinha: a densidade média continua uma linha por conversa,
// então a altura total, a rolagem e o carregamento sob demanda do WhatsApp
// seguem valendo. Nada é copiado: o cartão é a própria linha do WhatsApp, só
// reposicionada e reestilizada (clique, menu de contexto e selos continuam).
//
// Colunas: pela largura da lista (cartões com ~170 px), de 2 a 3.
//
// Teclado: com o foco na grade, as setas andam como numa grade (← → uma
// conversa, ↑ ↓ uma faixa), rolando a lista até o cartão. O foco vai para o
// item da conversa ([aria-selected]), onde o Enter do próprio WhatsApp a abre.

export const WHATSAPP_CHAT_GRID_CSS = `
html[data-bitwhat-panel="contacts"] #pane-side [role="grid"][data-bitwhat-chat-grid="true"] > [role="row"] {
  width: calc(100% / var(--bw-cols, 2)) !important;
  height: var(--bw-tile-h, 152px) !important;
  transform: translate(calc(var(--bw-col, 0) * 100%), var(--bw-y, 0px)) !important;
  padding: 4px !important;
  box-sizing: border-box !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] {
  height: 100% !important;
  border-radius: 14px !important;
  overflow: hidden !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div {
  height: 100% !important;
}

/* Conteúdo do cartão: foto no topo, nome + hora, prévia embaixo. */
html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  height: 100% !important;
  /* A caixa interna do WhatsApp (margem, cantos e fundo próprios) vira o cartão. */
  margin: 0 !important;
  border-radius: 14px !important;
  box-shadow: inset 0 0 0 1px var(--bw-card-border) !important;
  padding: 10px 10px 8px !important;
  gap: 6px !important;
  box-sizing: border-box !important;
  transition: box-shadow 120ms ease !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"]:hover > [role="gridcell"] > div > div {
  box-shadow: inset 0 0 0 1px var(--bw-card-accent) !important;
}

/* Foto: ampliada por igual quando o cartão é mais alto (3 colunas), sem mexer
   na estrutura interna (anel de status, ícone de grupo continuam centrados). */
html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :first-child {
  transform: scale(var(--bw-avatar-scale, 1)) !important;
  transform-origin: center !important;
  margin-block: calc((var(--bw-avatar-scale, 1) - 1) * 24px) !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :first-child,
html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :first-child > div {
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  justify-content: center !important;
  padding: 0 !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :first-child > div {
  margin: 0 !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :first-child > div > div:not(:has(img, svg)) {
  padding: 0 !important;
  margin: 0 !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :last-child {
  display: flex !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  gap: 4px !important;
}

/* Linha 1: nome e hora. */
html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :last-child > :first-child {
  min-height: 0 !important;
  align-items: baseline !important;
}

/* Linha 2: prévia da última mensagem, em até N linhas, com os selos ao lado. */
html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :last-child > :last-child {
  flex: 1 1 auto !important;
  align-items: flex-start !important;
  min-height: 0 !important;
  margin: 0 !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :last-child > :last-child > :first-child,
html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :last-child > :last-child > :first-child > span {
  height: auto !important;
  align-items: flex-start !important;
  min-width: 0 !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :last-child > :last-child span[dir],
html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div > div > :last-child > :last-child > :first-child > span > span:last-child {
  display: -webkit-box !important;
  -webkit-box-orient: vertical !important;
  -webkit-line-clamp: var(--bw-preview-lines, 3) !important;
  white-space: normal !important;
  overflow: hidden !important;
  overflow-wrap: anywhere !important;
  line-height: 1.3 !important;
  height: auto !important;
  max-height: none !important;
}

/* Cartão com foco do teclado. */
html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"]:focus-visible,
html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"] > [role="gridcell"] > div:focus-visible {
  outline: none !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] > [role="row"]:has(:focus-visible) > [role="gridcell"] > div > div {
  box-shadow: inset 0 0 0 2px var(--bw-card-accent) !important;
}

html[data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] {
  --bw-card-bg: rgba(255, 255, 255, 0.035);
  --bw-card-border: rgba(134, 150, 160, 0.18);
  --bw-card-accent: #41c7aa;
}

html[data-bitwhat-theme="light"][data-bitwhat-panel="contacts"] [data-bitwhat-chat-grid="true"] {
  --bw-card-bg: rgba(15, 118, 110, 0.035);
  --bw-card-border: rgba(15, 23, 42, 0.1);
  --bw-card-accent: #0f766e;
}
`

export function createWhatsAppChatGridScript(): string {
  return `
(() => {
  const stateKey = '__bitWhatChatGrid';
  if (window[stateKey]) {
    window[stateKey].schedule();
    return;
  }

  const MIN_CARD_WIDTH = 170;
  const MAX_COLUMNS = 3;
  let grid = null;
  let gridObserver = null;
  let frame = 0;
  let rowHeight = 76;
  let columns = 2;
  let lastIndex = null;

  const parseY = (row) => {
    const match = /translateY\\((-?[\\d.]+)px\\)/.exec(row.style.transform || '');
    return match ? Number(match[1]) : null;
  };

  const layout = () => {
    frame = 0;
    const active = document.documentElement.getAttribute('data-bitwhat-panel') === 'contacts';
    const current = document.querySelector('#pane-side [role="grid"]');

    if (grid && grid !== current) {
      grid.removeAttribute('data-bitwhat-chat-grid');
      gridObserver?.disconnect();
      grid = null;
    }
    if (!active || !(current instanceof HTMLElement)) {
      return;
    }
    if (grid !== current) {
      grid = current;
      grid.setAttribute('data-bitwhat-chat-grid', 'true');
      gridObserver = new MutationObserver(schedule);
      gridObserver.observe(grid, { childList: true, subtree: false, attributes: true, attributeFilter: ['style'], attributeOldValue: false });
      Array.from(grid.children).forEach((row) => gridObserver.observe(row, { attributes: true, attributeFilter: ['style'] }));
    }

    const rows = Array.from(grid.children).filter((row) => row.getAttribute('role') === 'row');
    if (rows.length === 0) {
      return;
    }

    // Resultados de busca misturam cabeçalhos e mensagens com alturas
    // diferentes: aí a grade se desliga e a lista normal do WhatsApp aparece.
    const uniform = new Set(rows.map((row) => row.style.height)).size === 1;
    const mode = uniform ? 'true' : 'off';
    if (grid.getAttribute('data-bitwhat-chat-grid') !== mode) {
      grid.setAttribute('data-bitwhat-chat-grid', mode);
    }
    if (!uniform) {
      return;
    }

    rowHeight = parseFloat(rows[0].style.height) || 76;
    const width = grid.getBoundingClientRect().width || 0;
    columns = Math.max(2, Math.min(MAX_COLUMNS, Math.floor(width / MIN_CARD_WIDTH) || 2));
    const setVar = (element, name, value) => {
      if (element.style.getPropertyValue(name) !== value) {
        element.style.setProperty(name, value);
      }
    };
    setVar(grid, '--bw-cols', String(columns));
    setVar(grid, '--bw-tile-h', rowHeight * columns + 'px');
    setVar(grid, '--bw-preview-lines', String(columns === 3 ? 5 : 3));
    setVar(grid, '--bw-avatar-scale', columns === 3 ? '1.45' : '1');

    rows.forEach((row) => {
      gridObserver.observe(row, { attributes: true, attributeFilter: ['style'] });
      const y = parseY(row);
      if (y === null) {
        return;
      }
      const index = Math.round(y / rowHeight);
      const column = index % columns;
      const band = Math.floor(index / columns);
      const nextY = band * rowHeight * columns + 'px';
      if (row.style.getPropertyValue('--bw-col') !== String(column)) {
        row.style.setProperty('--bw-col', String(column));
      }
      if (row.style.getPropertyValue('--bw-y') !== nextY) {
        row.style.setProperty('--bw-y', nextY);
      }
    });
  };

  // --- Navegação pelas setas -------------------------------------------------
  const ARROW_STEPS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  const listRows = () => Array.from(grid.children).filter((row) => row.getAttribute('role') === 'row');
  const rowIndex = (row) => {
    const y = parseY(row);
    return y === null ? null : Math.round(y / rowHeight);
  };
  const isEditable = (element) =>
    element instanceof HTMLElement && (element.isContentEditable || element.matches('input, textarea, select'));

  // Sem foco na grade: começa pela conversa aberta, pela última visitada (ex.:
  // ao voltar de uma conversa com Esc) ou pelo primeiro cartão visível.
  const startIndex = () => {
    const rows = listRows();
    const selected = rows.find((row) => row.querySelector('[aria-selected="true"]'));
    if (selected) {
      return rowIndex(selected);
    }
    if (lastIndex !== null) {
      return lastIndex;
    }
    const pane = document.querySelector('#pane-side');
    const top = pane ? pane.getBoundingClientRect().top : 0;
    const visible = rows
      .filter((row) => row.getBoundingClientRect().top >= top - 1)
      .map(rowIndex)
      .filter((index) => index !== null)
      .sort((a, b) => a - b);
    return visible.length > 0 ? visible[0] : null;
  };

  // Rola a lista até o cartão inteiro ficar visível. A lista do WhatsApp
  // desenha a conversa ao rolar; o foco vem quando ela existir.
  const reveal = (index) => {
    const pane = document.querySelector('#pane-side');
    if (!pane) {
      return;
    }
    const tileHeight = rowHeight * columns;
    const paneTop = pane.getBoundingClientRect().top;
    // Origem dos cartões no conteúdo rolável, medida num cartão já desenhado
    // (a lista do WhatsApp tem um pequeno recuo além do topo da grade).
    const sample = listRows().find((row) => row.style.getPropertyValue('--bw-y'));
    const origin = sample
      ? sample.getBoundingClientRect().top - paneTop + pane.scrollTop - parseFloat(sample.style.getPropertyValue('--bw-y'))
      : grid.getBoundingClientRect().top - paneTop + pane.scrollTop;
    const top = origin + Math.floor(index / columns) * tileHeight;
    const bottom = top + tileHeight;
    if (top < pane.scrollTop) {
      pane.scrollTop = top;
    } else if (bottom > pane.scrollTop + pane.clientHeight) {
      pane.scrollTop = bottom - pane.clientHeight;
    }
  };

  // Item focável da conversa: nele o Enter do WhatsApp abre a conversa (na
  // célula [role="gridcell"] o Enter não faz nada).
  const chatItem = (row) => row.querySelector('[aria-selected]') || row.querySelector('[role="gridcell"]');

  const focusIndex = (index, attempt = 0) => {
    const row = grid && listRows().find((candidate) => rowIndex(candidate) === index);
    const item = row && chatItem(row);
    if (item instanceof HTMLElement) {
      item.focus({ preventScroll: true });
    } else if (attempt < 30) {
      requestAnimationFrame(() => focusIndex(index, attempt + 1));
    }
  };

  const goTo = (index) => {
    lastIndex = index;
    reveal(index);
    focusIndex(index);
  };

  const onKeyDown = (event) => {
    const step = ARROW_STEPS[event.key];
    if (!step || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    if (
      document.documentElement.getAttribute('data-bitwhat-panel') !== 'contacts' ||
      !grid || !grid.isConnected || grid.getAttribute('data-bitwhat-chat-grid') !== 'true' ||
      document.querySelector('[role="menu"], [role="dialog"]')
    ) {
      return;
    }

    const active = document.activeElement;
    if (!active || !grid.contains(active)) {
      // Só assume o teclado se o foco não estiver em nada útil (página ou um
      // contêiner da lista); campos de texto e outros painéis ficam intactos.
      const idle = !active || active === document.body || (active.contains(grid) && !isEditable(active));
      const index = idle ? startIndex() : null;
      if (index !== null) {
        event.preventDefault();
        event.stopImmediatePropagation();
        goTo(index);
      }
      return;
    }

    const row = active.closest('[role="row"]');
    const index = row ? rowIndex(row) : null;
    if (index === null) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();

    const total =
      Number(grid.getAttribute('aria-rowcount')) || Math.round((parseFloat(grid.style.height) || 0) / rowHeight);
    let target = index;
    if (step === 'left') {
      target = index - 1;
    } else if (step === 'right') {
      target = index + 1;
    } else if (step === 'up') {
      target = index - columns;
    } else {
      target = index + columns;
      // Última faixa incompleta: ↓ vai para o último cartão.
      if (target >= total && Math.floor(index / columns) < Math.floor((total - 1) / columns)) {
        target = total - 1;
      }
    }
    if (target >= 0 && target < total && target !== index) {
      goTo(target);
    }
  };
  window.addEventListener('keydown', onKeyDown, true);

  // Foco que cai na célula (Tab) passa para o item, para o Enter funcionar.
  document.addEventListener('focusin', (event) => {
    const cell = event.target instanceof HTMLElement && event.target.matches('[role="gridcell"]') ? event.target : null;
    if (!cell || !grid || !grid.contains(cell) || grid.getAttribute('data-bitwhat-chat-grid') !== 'true') {
      return;
    }
    const item = cell.querySelector('[aria-selected]');
    if (item instanceof HTMLElement) {
      item.focus({ preventScroll: true });
    }
  }, true);

  function schedule() {
    if (!frame) {
      frame = requestAnimationFrame(layout);
    }
  }

  // Lista pode ser recriada (troca de filtro, recarga) e o painel muda de modo.
  const rootObserver = new MutationObserver(schedule);
  rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bitwhat-panel'] });
  const bodyObserver = new MutationObserver(() => {
    const current = document.querySelector('#pane-side [role="grid"]');
    if (current !== grid) {
      schedule();
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);

  window[stateKey] = { schedule };
  layout();
})()
`
}
