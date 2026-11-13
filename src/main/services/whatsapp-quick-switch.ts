// Troca rápida de conversas, injetada na página do WhatsApp Web:
// - guarda as conversas abertas recentemente (só o nome, em memória da página;
//   nunca em disco nem no log) e as informa ao app para a barra de recentes;
// - Ctrl+Tab abre a conversa anterior; a barra abre qualquer uma delas;
// - na grade, começar a digitar leva o texto para a busca de conversas.
//
// Abrir uma conversa pelo nome: volta aos contatos, acha o cartão na lista
// (rolando se preciso), põe o foco nele e pede ao app um Enter de verdade
// (eventos sintéticos não abrem conversas no WhatsApp). O painel troca para o
// chat pelo mesmo caminho do Enter da navegação por setas.

export interface QuickSwitchOptions {
  recentChats: boolean
  typeToSearch: boolean
}

export const RECENTS_PREFIX = '__BITWHAT_RECENTS__:'
export const KEY_REQUEST_PREFIX = '__BITWHAT_KEY__:'
export const SHORTCUTS_PREFIX = '__BITWHAT_SHORTCUTS__'
const PANEL_PREFIX = '__BITWHAT_PANEL__:'

export const WHATSAPP_QUICK_SWITCH_CSS = `
/* Durante a troca de conversa a lista aparece só por um instante: fica
   transparente (não invisível: o cartão precisa receber foco). */
html[data-bitwhat-switching="true"] #app {
  opacity: 0 !important;
}
`

export function createWhatsAppQuickSwitchScript(options: QuickSwitchOptions): string {
  return `
(() => {
  const options = ${JSON.stringify(options)};
  const stateKey = '__bitWhatQuickSwitch';
  if (window[stateKey]) {
    window[stateKey].setOptions(options);
    return;
  }

  const MAX_RECENTS = 6;
  const root = document.documentElement;
  let current = options;
  let recents = [];
  let lastReported = '';
  let switching = 0;

  const panel = () => root.getAttribute('data-bitwhat-panel');
  const inChat = () => panel() === 'chat' || panel() === 'mini-chat';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const isEditable = (element) =>
    element instanceof HTMLElement && (element.isContentEditable || element.matches('input, textarea, select'));
  const overlayOpen = () =>
    Array.from(document.querySelectorAll('[role="menu"], [role="dialog"], [aria-modal="true"]')).some((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });

  const openChatName = () => {
    const title = document.querySelector('#main header [data-testid="conversation-info-header-chat-title"]') ||
      document.querySelector('#main header span[dir="auto"]');
    const name = title ? (title.textContent || '').trim() : '';
    return name || null;
  };

  const report = () => {
    if (!current.recentChats) {
      recents = [];
    }
    const name = inChat() ? openChatName() : null;
    const payload = JSON.stringify(recents.map((recent) => ({ name: recent, current: recent === name })));
    if (payload !== lastReported) {
      lastReported = payload;
      console.log(${JSON.stringify(RECENTS_PREFIX)} + payload);
    }
  };

  // Conversa aberta entra no topo da lista de recentes.
  const track = () => {
    if (!current.recentChats || !inChat()) {
      report();
      return;
    }
    const name = openChatName();
    if (name && recents[0] !== name) {
      recents = [name, ...recents.filter((recent) => recent !== name)].slice(0, MAX_RECENTS);
    }
    report();
  };

  const rowName = (row) => {
    const title = row.querySelector('span[dir="auto"][title]');
    return title ? title.getAttribute('title') : null;
  };

  const findRow = async (name) => {
    const pane = document.querySelector('#pane-side');
    if (!(pane instanceof HTMLElement)) {
      return null;
    }
    const find = () =>
      Array.from(pane.querySelectorAll('[role="grid"] > [role="row"]')).find((row) => rowName(row) === name) || null;
    pane.scrollTop = 0;
    await sleep(120);
    for (let step = 0; step < 15; step += 1) {
      const row = find();
      if (row) {
        return row;
      }
      if (pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2) {
        break;
      }
      pane.scrollTop += Math.max(200, pane.clientHeight * 0.8);
      await sleep(140);
    }
    return find();
  };

  const waitFor = async (check, timeout) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (check()) {
        return true;
      }
      await sleep(60);
    }
    return check();
  };

  const finishSwitching = () => {
    switching = 0;
    root.removeAttribute('data-bitwhat-switching');
  };

  // Conversas com mensagens não lidas entre as que a lista tem renderizadas
  // (o topo da lista, onde ficam as mais recentes). Para o menu do balão.
  const unread = () => {
    const rows = Array.from(document.querySelectorAll('#pane-side [role="grid"] > [role="row"]'));
    const position = (row) => {
      const match = /translateY[(](-?[0-9.]+)px[)]/.exec(row.style.transform || '');
      return match ? Number(match[1]) : 0;
    };
    return rows
      .sort((a, b) => position(a) - position(b))
      .map((row) => {
        const label = Array.from(row.querySelectorAll('[aria-label]'))
          .map((element) => element.getAttribute('aria-label') || '')
          .find((text) => /n[ãa]o lid|unread/i.test(text));
        if (!label) {
          return null;
        }
        const count = Number((/[0-9]+/.exec(label) || ['0'])[0]);
        const name = rowName(row);
        return name ? { name, count } : null;
      })
      .filter(Boolean)
      .slice(0, 10);
  };

  const open = (index) => openName(recents[index]);

  const openName = async (name) => {
    if (!name || switching) {
      return false;
    }
    if (inChat() && openChatName() === name) {
      return true;
    }
    switching = Date.now();
    root.setAttribute('data-bitwhat-switching', 'true');
    // Segurança: a lista nunca fica escondida por mais de 5 s.
    const guard = setTimeout(finishSwitching, 5000);
    try {
      if (panel() !== 'contacts') {
        console.log(${JSON.stringify(PANEL_PREFIX)} + 'contacts');
      }
      const ready = await waitFor(
        () => panel() === 'contacts' && document.querySelector('#pane-side [role="grid"] > [role="row"]'),
        3000
      );
      if (!ready) {
        return false;
      }
      const row = await findRow(name);
      const item = row && (row.querySelector('[aria-selected]') || row.querySelector('[role="gridcell"]'));
      if (!(item instanceof HTMLElement)) {
        return false;
      }
      item.focus();
      console.log(${JSON.stringify(KEY_REQUEST_PREFIX)} + 'Enter');
      await waitFor(() => inChat() && openChatName() === name, 2500);
      return inChat();
    } finally {
      clearTimeout(guard);
      finishSwitching();
    }
  };

  const onKeyDown = (event) => {
    // Ctrl+/ ou F1: lista de atalhos do app. (Teclas reais já são tratadas pelo
    // app antes de chegar aqui; isto cobre os demais casos.)
    if (event.key === 'F1' || (event.ctrlKey && event.key === '/')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.log(${JSON.stringify('__BITWHAT_SHORTCUTS__')});
      return;
    }
    if (switching) {
      return;
    }
    // Ctrl+Tab: conversa anterior (no chat) ou a última aberta (na grade).
    if (event.key === 'Tab' && event.ctrlKey && !event.altKey && !event.metaKey) {
      if (!current.recentChats || overlayOpen()) {
        return;
      }
      const index = inChat() ? 1 : 0;
      if (!recents[index]) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      void open(index);
      return;
    }

    // Digitar na grade: o primeiro caractere já vai para a busca.
    if (
      current.typeToSearch &&
      panel() === 'contacts' &&
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      !isEditable(event.target) &&
      !overlayOpen()
    ) {
      const search = document.querySelector('#side input[role="textbox"], #side [contenteditable="true"][role="textbox"]');
      if (search instanceof HTMLElement) {
        // Foco trocado durante o keydown: o caractere cai na busca.
        search.focus();
      }
    }
  };

  window.addEventListener('keydown', onKeyDown, true);
  let frame = 0;
  const observer = new MutationObserver(() => {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        track();
      });
    }
  });
  observer.observe(root, { attributes: true, attributeFilter: ['data-bitwhat-panel'] });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  window[stateKey] = {
    open,
    openName,
    unread,
    setOptions: (next) => {
      current = next;
      track();
    },
    report: () => {
      lastReported = '';
      report();
    }
  };
  track();
})();
`
}
