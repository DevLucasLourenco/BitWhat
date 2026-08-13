import type { ThemePreference, WhatsAppPanelMode } from '../../shared/types'

export const WHATSAPP_PANEL_CSS = `
html[data-bitwhat-panel="contacts"],
html[data-bitwhat-panel="chat"],
html[data-bitwhat-panel="mini-chat"],
html[data-bitwhat-panel="contacts"] body,
html[data-bitwhat-panel="chat"] body,
html[data-bitwhat-panel="mini-chat"] body,
html[data-bitwhat-panel="contacts"] #app,
html[data-bitwhat-panel="chat"] #app,
html[data-bitwhat-panel="mini-chat"] #app {
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  overflow: hidden !important;
}

html[data-bitwhat-panel="contacts"] #app,
html[data-bitwhat-panel="chat"] #app,
html[data-bitwhat-panel="mini-chat"] #app {
  position: fixed !important;
  inset: 0 !important;
}

html[data-bitwhat-panel="contacts"] #app:not([data-bitwhat-connected-projection="true"]) > :not(#bitwhat-stage),
html[data-bitwhat-panel="chat"] #app:not([data-bitwhat-connected-projection="true"]) > :not(#bitwhat-stage),
html[data-bitwhat-panel="mini-chat"] #app:not([data-bitwhat-connected-projection="true"]) > :not(#bitwhat-stage) {
  display: none !important;
  visibility: hidden !important;
}

[data-bitwhat-panel-hidden="true"] {
  display: none !important;
  visibility: hidden !important;
}

#bitwhat-stage {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  display: flex !important;
  width: 100vw !important;
  height: 100vh !important;
  min-width: 0 !important;
  max-width: none !important;
  overflow: hidden !important;
  background: var(--app-background, var(--background-default, transparent)) !important;
  contain: layout style paint !important;
}

#bitwhat-stage > [data-bitwhat-stage-child="true"] {
  position: relative !important;
  inset: auto !important;
  display: flex !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  flex: 1 1 100% !important;
  border: 0 !important;
  transform: none !important;
  opacity: 1 !important;
}

#bitwhat-stage[data-panel="contacts"] [data-bitwhat-contacts-shell="true"] {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

#bitwhat-stage[data-panel="contacts"],
#bitwhat-stage[data-panel="contacts"] [data-bitwhat-contacts-shell="true"],
#bitwhat-stage[data-panel="contacts"] [data-bitwhat-contacts-fill="true"],
#bitwhat-stage[data-panel="contacts"] [data-bitwhat-contact-list="true"] {
  background: var(--background-default, var(--panel-background-lighter, transparent)) !important;
}

html[data-bitwhat-panel="contacts"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-contacts-shell="true"],
html[data-bitwhat-panel="contacts"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-contacts-fill="true"] {
  display: flex !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  overflow: hidden !important;
}

html[data-bitwhat-panel="contacts"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-contact-list="true"] {
  display: block !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

#bitwhat-stage[data-panel="contacts"] [data-bitwhat-contacts-fill="true"] {
  display: flex !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  overflow: hidden !important;
}

#bitwhat-stage[data-panel="contacts"] [data-bitwhat-contact-list="true"] {
  display: block !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

#bitwhat-stage[data-panel="contacts"] [role="row"],
#bitwhat-stage[data-panel="contacts"] [data-testid="cell-frame-container"] {
  max-width: none !important;
}

#bitwhat-stage [data-bitwhat-download-footer="true"] {
  display: none !important;
  visibility: hidden !important;
}

#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-shell="true"],
#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-fill="true"],
#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-panel="true"],
#bitwhat-stage[data-panel="mini-chat"] [data-bitwhat-chat-shell="true"],
#bitwhat-stage[data-panel="mini-chat"] [data-bitwhat-chat-fill="true"],
#bitwhat-stage[data-panel="mini-chat"] [data-bitwhat-chat-panel="true"] {
  display: flex !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  overflow: hidden !important;
}

html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-shell="true"],
html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-fill="true"],
html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-panel="true"] {
  display: flex !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  overflow: hidden !important;
}

#bitwhat-stage[data-panel="chat"],
#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-shell="true"],
#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-fill="true"],
#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-panel="true"],
#bitwhat-stage[data-panel="mini-chat"],
#bitwhat-stage[data-panel="mini-chat"] [data-bitwhat-chat-shell="true"],
#bitwhat-stage[data-panel="mini-chat"] [data-bitwhat-chat-fill="true"],
#bitwhat-stage[data-panel="mini-chat"] [data-bitwhat-chat-panel="true"] {
  background: var(--conversation-panel-background, var(--background-default, transparent)) !important;
}

#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-panel="true"] header {
  min-height: 56px !important;
  padding-inline: 12px !important;
}

html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-panel="true"] header {
  min-height: 56px !important;
  padding-inline: 12px !important;
}

#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-panel="true"] header > :first-child {
  min-width: 0 !important;
  max-width: 100% !important;
  flex: 1 1 auto !important;
}

html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-panel="true"] header > :first-child {
  min-width: 0 !important;
  max-width: 100% !important;
  flex: 1 1 auto !important;
}

#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-composer="true"] {
  display: flex !important;
  flex: 0 0 auto !important;
  min-height: 52px !important;
  visibility: visible !important;
  opacity: 1 !important;
}

html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-composer="true"] {
  display: flex !important;
  flex: 0 0 auto !important;
  min-height: 52px !important;
  visibility: visible !important;
  opacity: 1 !important;
}

#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-composer="true"] [contenteditable="true"],
#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-composer="true"] textarea,
#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-composer="true"] [role="textbox"] {
  visibility: visible !important;
  opacity: 1 !important;
}

html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-composer="true"] [contenteditable="true"],
html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-composer="true"] textarea,
html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-composer="true"] [role="textbox"] {
  visibility: visible !important;
  opacity: 1 !important;
}

#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-composer="true"] [data-testid="compose-box"],
html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-composer="true"] [data-testid="compose-box"] {
  flex: 1 1 auto !important;
  width: auto !important;
  min-width: 0 !important;
}

#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-composer="true"] :has(> [data-testid="conversation-compose-box-input"]),
html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-composer="true"] :has(> [data-testid="conversation-compose-box-input"]) {
  display: flex !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  min-width: 0 !important;
}

#bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-composer="true"] [data-testid="conversation-compose-box-input"],
html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-composer="true"] [data-testid="conversation-compose-box-input"] {
  display: block !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  min-width: 32px !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

@media (max-width: 520px) {
  #bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-composer="true"] [data-testid="compose-box"] button:not(:has([data-icon="mic-outlined"], [data-testid="mic-outlined"], [data-icon*="send" i], [data-testid*="send" i])),
  html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-composer="true"] [data-testid="compose-box"] button:not(:has([data-icon="mic-outlined"], [data-testid="mic-outlined"], [data-icon*="send" i], [data-testid*="send" i])) {
    display: none !important;
    visibility: hidden !important;
  }

  #bitwhat-stage[data-panel="chat"] [data-bitwhat-chat-composer="true"] [data-testid="conversation-compose-box-input"],
  html[data-bitwhat-panel="chat"] #app[data-bitwhat-connected-projection="true"] [data-bitwhat-chat-composer="true"] [data-testid="conversation-compose-box-input"] {
    min-width: 96px !important;
  }
}

#bitwhat-stage[data-panel="mini-chat"] [data-bitwhat-chat-panel="true"] {
  align-self: flex-start !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
}

#bitwhat-stage[data-panel="mini-chat"] [data-bitwhat-chat-panel="true"][data-bitwhat-mini-ready="true"] > :not(#bitwhat-mini-chat-layout) {
  display: none !important;
  visibility: hidden !important;
}

#bitwhat-mini-chat-layout {
  display: grid !important;
  grid-template-columns: minmax(96px, 24%) minmax(0, 1fr) !important;
  grid-template-rows: minmax(132px, 168px) minmax(48px, auto) !important;
  width: 100% !important;
  height: min(248px, 100vh) !important;
  max-height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  background: var(--conversation-panel-background, var(--background-default, transparent)) !important;
}

#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] {
  grid-column: 1 !important;
  grid-row: 1 / span 2 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  padding: 10px 6px !important;
  overflow: hidden !important;
  border-inline-end: 1px solid var(--border-list, rgba(134, 150, 160, 0.22)) !important;
}

#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] > :first-child {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 8px !important;
  width: 100% !important;
  min-width: 0 !important;
  overflow: hidden !important;
}

#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"],
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] * {
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
}

#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] img,
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] canvas,
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] [data-icon] {
  flex: 0 0 auto !important;
  width: 44px !important;
  height: 44px !important;
  max-width: 44px !important;
  max-height: 44px !important;
}

#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] [dir="auto"],
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] span[title],
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] div[title] {
  display: -webkit-box !important;
  width: 100% !important;
  overflow: hidden !important;
  -webkit-box-orient: vertical !important;
  -webkit-line-clamp: 2 !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  line-height: 1.2 !important;
  text-align: center !important;
}

#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] > :not(:first-child),
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] > :not(:first-child) button,
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] > :not(:first-child) [role="button"],
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] > :not(:first-child) [data-icon="search"],
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] > :not(:first-child) [data-icon="menu"],
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] > :not(:first-child) [data-icon="more"],
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] > :not(:first-child) [data-icon="audio-call"],
#bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] > :not(:first-child) [data-icon="video-call"] {
  display: none !important;
  visibility: hidden !important;
}

#bitwhat-mini-chat-layout > [data-bitwhat-message-scroll="true"] {
  grid-column: 2 !important;
  grid-row: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 168px !important;
  max-height: 168px !important;
  min-height: 126px !important;
  min-width: 0 !important;
  position: relative !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
}

#bitwhat-mini-chat-layout > [data-bitwhat-message-scroll="true"] > * {
  max-width: 100% !important;
  min-width: 0 !important;
}

#bitwhat-mini-chat-layout > [data-bitwhat-chat-composer="true"] {
  grid-column: 2 !important;
  grid-row: 2 !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 44px !important;
  max-height: 74px !important;
  overflow: hidden !important;
}

@media (max-width: 390px) {
  #bitwhat-mini-chat-layout {
    grid-template-columns: minmax(82px, 24%) minmax(0, 1fr) !important;
    grid-template-rows: minmax(118px, 154px) minmax(42px, auto) !important;
  }

  #bitwhat-mini-chat-layout > [data-bitwhat-message-scroll="true"] {
    height: 154px !important;
    max-height: 154px !important;
  }

  #bitwhat-mini-chat-layout > [data-bitwhat-chat-header="true"] {
    padding: 6px 4px !important;
  }
}
`

export const WHATSAPP_THEME_CSS = `
html[data-bitwhat-theme="light"],
html[data-bitwhat-theme="light"] body {
  color-scheme: light !important;
  background: #f0f2f5 !important;
}

html[data-bitwhat-theme="light"] {
  --app-background: #f0f2f5 !important;
  --app-background-rgb: 240, 242, 245 !important;
  --background-default: #ffffff !important;
  --background-default-active: #f0f2f5 !important;
  --background-default-hover: #f5f6f6 !important;
  --background-lighter: #ffffff !important;
  --panel-background: #ffffff !important;
  --panel-background-lighter: #ffffff !important;
  --conversation-panel-background: #efeae2 !important;
  --conversation-panel-background-rgb: 239, 234, 226 !important;
  --intro-background: #f0f2f5 !important;
  --incoming-background: #ffffff !important;
  --incoming-background-deeper: #f5f6f6 !important;
  --outgoing-background: #d9fdd3 !important;
  --outgoing-background-deeper: #d1f4cc !important;
  --compose-panel-background: #f0f2f5 !important;
  --compose-input-background: #ffffff !important;
  --search-input-background: #f0f2f5 !important;
  --modal-background: #ffffff !important;
  --drawer-background: #ffffff !important;
  --drawer-section-background: #ffffff !important;
  --primary: #111b21 !important;
  --primary-strong: #111b21 !important;
  --primary-title: #111b21 !important;
  --secondary: #667781 !important;
  --secondary-stronger: #3b4a54 !important;
  --text-secondary: #667781 !important;
  --icon: #54656f !important;
  --icon-strong: #54656f !important;
  --border-list: #e9edef !important;
  --border-panel: #e9edef !important;
  --teal: #008069 !important;
  --teal-hover: #017561 !important;
}

html[data-bitwhat-theme="light"] #app,
html[data-bitwhat-theme="light"] #bitwhat-stage,
html[data-bitwhat-theme="light"] [data-bitwhat-contacts-shell="true"],
html[data-bitwhat-theme="light"] [data-bitwhat-contacts-fill="true"],
html[data-bitwhat-theme="light"] [data-bitwhat-contact-list="true"] {
  background: var(--background-default) !important;
  color: var(--primary) !important;
}

html[data-bitwhat-theme="light"] [data-bitwhat-chat-shell="true"],
html[data-bitwhat-theme="light"] [data-bitwhat-chat-fill="true"],
html[data-bitwhat-theme="light"] [data-bitwhat-chat-panel="true"],
html[data-bitwhat-theme="light"] #bitwhat-mini-chat-layout {
  background: var(--conversation-panel-background) !important;
  color: var(--primary) !important;
}

html[data-bitwhat-theme="light"] header,
html[data-bitwhat-theme="light"] footer,
html[data-bitwhat-theme="light"] [data-bitwhat-chat-composer="true"] {
  background: var(--compose-panel-background) !important;
  color: var(--primary) !important;
}

html[data-bitwhat-theme="light"] [contenteditable="true"],
html[data-bitwhat-theme="light"] textarea,
html[data-bitwhat-theme="light"] [role="textbox"] {
  background: var(--compose-input-background) !important;
  color: var(--primary) !important;
}
`

export function createApplyWhatsAppThemeScript(theme: ThemePreference): string {
  return `
(() => {
  const requestedTheme = ${JSON.stringify(theme)};
  const root = document.documentElement;
  const body = document.body;

  if (requestedTheme === 'light') {
    root.setAttribute('data-bitwhat-theme', 'light');
    root.style.setProperty('color-scheme', 'light', 'important');
    body?.style?.setProperty('color-scheme', 'light', 'important');
    return;
  }

  root.removeAttribute('data-bitwhat-theme');
  root.style.removeProperty('color-scheme');
  body?.style?.removeProperty('color-scheme');
})()
`
}

export function createEnableWhatsAppPanelScript(panel: WhatsAppPanelMode): string {
  return `
(() => {
  const requestedPanel = ${JSON.stringify(panel)};
  const stateKey = '__bitWhatPanel';
  const messagePrefix = '__BITWHAT_PANEL__:';
  const diagnosticPrefix = '__BITWHAT_PANEL_DIAG__:';
  const root = document.documentElement;

  const isElement = (value) => value instanceof HTMLElement;

  const describeElement = (element) => {
    if (!isElement(element)) {
      return 'none';
    }

    const id = element.id ? '#' + element.id : '';
    const testId = element.getAttribute('data-testid');
    const role = element.getAttribute('role');
    const aria = element.getAttribute('aria-label');
    return [
      element.tagName.toLowerCase() + id,
      testId ? 'testid=' + testId : '',
      role ? 'role=' + role : '',
      aria ? 'aria=' + aria : ''
    ].filter(Boolean).join(' ');
  };

  const restoreCollection = (items) => {
    if (!Array.isArray(items)) {
      return;
    }

    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item?.placeholder?.parentNode && item.node) {
        item.placeholder.parentNode.replaceChild(item.node, item.placeholder);
      }
    }
  };

  const clearPanelAttributes = (items) => {
    if (!Array.isArray(items)) {
      return;
    }

    items.forEach((element) => {
      if (element instanceof HTMLElement) {
        element.removeAttribute('data-bitwhat-contacts-fill');
        element.removeAttribute('data-bitwhat-chat-fill');
      }
    });
  };

  const clearHiddenAttributes = (items) => {
    if (!Array.isArray(items)) {
      return;
    }

    items.forEach((element) => {
      if (element instanceof HTMLElement) {
        element.removeAttribute('data-bitwhat-panel-hidden');
      }
    });
  };

  const restoreState = (state) => {
    if (!state) {
      return;
    }

    state.observer?.disconnect?.();
    if (typeof state.onClick === 'function') {
      document.removeEventListener('click', state.onClick, true);
    }
    window.clearTimeout(state.timer);

    restoreCollection(state.pruned);
    restoreCollection(state.miniMoved);
    state.miniLayout?.remove?.();

    if (state.moved && state.placeholder?.parentNode) {
      state.placeholder.parentNode.replaceChild(state.moved, state.placeholder);
    }

    if (state.moved instanceof HTMLElement) {
      state.moved.removeAttribute('data-bitwhat-stage-child');
      state.moved.removeAttribute('data-bitwhat-contacts-shell');
      state.moved.removeAttribute('data-bitwhat-chat-shell');
    }

    if (state.contactList instanceof HTMLElement) {
      state.contactList.removeAttribute('data-bitwhat-contact-list');
    }

    if (state.chatPanel instanceof HTMLElement) {
      state.chatPanel.removeAttribute('data-bitwhat-chat-panel');
      state.chatPanel.removeAttribute('data-bitwhat-mini-ready');
    }

    if (state.chatHeader instanceof HTMLElement) {
      state.chatHeader.removeAttribute('data-bitwhat-chat-header');
    }

    if (state.messageScroll instanceof HTMLElement) {
      state.messageScroll.removeAttribute('data-bitwhat-message-scroll');
    }

    if (state.chatComposer instanceof HTMLElement) {
      state.chatComposer.removeAttribute('data-bitwhat-chat-composer');
    }

    if (state.appRoot instanceof HTMLElement) {
      state.appRoot.removeAttribute('data-bitwhat-connected-projection');
    }

    clearHiddenAttributes(state.hidden);
    clearPanelAttributes(state.fillPath);
    state.stage?.remove?.();
    restoreCollection(state.detached);
  };

  restoreState(window[stateKey]);
  root.removeAttribute('data-bitwhat-panel');
  root.removeAttribute('data-bitwhat-panel-pending');

  const state = {
    appRoot: undefined,
    stage: undefined,
    moved: undefined,
    contactList: undefined,
    chatPanel: undefined,
    chatHeader: undefined,
    messageScroll: undefined,
    chatComposer: undefined,
    miniLayout: undefined,
    miniMoved: [],
    connectedProjection: false,
    hidden: [],
    fillPath: [],
    placeholder: undefined,
    detached: [],
    pruned: [],
    vault: document.createDocumentFragment(),
    observer: undefined,
    onClick: undefined,
    timer: undefined,
    lastDiagnostic: ''
  };

  window[stateKey] = state;

  const publishDiagnostic = (message) => {
    if (state.lastDiagnostic === message) {
      return;
    }

    state.lastDiagnostic = message;
    console.info(diagnosticPrefix + message);
  };

  const getAppRoot = () => {
    const app = document.querySelector('#app');
    return app instanceof HTMLElement ? app : document.body;
  };

  const contactListSelector = [
    '#pane-side',
    '[data-testid="chat-list"]',
    '[aria-label="Chat list"]',
    '[aria-label="Lista de conversas"]',
    '[aria-label="Chats"]',
    '[aria-label="Conversas"]',
    '[role="grid"]',
    '[role="listbox"]'
  ].join(',');

  const contactRowSelector = [
    '[role="row"]',
    '[data-testid="cell-frame-container"]',
    '[data-id]',
    '[data-testid*="cell" i]'
  ].join(',');

  const chatPanelSelector = [
    '#main',
    'main[role="main"]',
    '[role="main"]',
    '[data-testid="conversation-panel-wrapper"]',
    '[data-testid*="conversation" i]',
    '[aria-label*="mensagem" i]',
    '[aria-label*="message" i]'
  ].join(',');

  const chatTextboxSelector = [
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"][aria-label]',
    'textarea[aria-label]',
    '[role="textbox"]'
  ].join(',');

  const findChatTextbox = (scope = document) =>
    Array.from(scope.querySelectorAll?.(chatTextboxSelector) || [])
      .filter(isElement)
      .find((element) => !element.closest('#side, [data-testid="side"], aside, #pane-side')) || null;

  const countContactRows = (element) => {
    if (!isElement(element)) {
      return 0;
    }

    return element.querySelectorAll(contactRowSelector).length;
  };

  const scoreContactList = (element) => {
    if (!isElement(element)) {
      return -9999;
    }

    const rowCount = countContactRows(element);
    const id = element.id || '';
    const role = element.getAttribute('role') || '';
    const testId = element.getAttribute('data-testid') || '';
    const aria = element.getAttribute('aria-label') || '';
    const className = typeof element.className === 'string' ? element.className : '';
    const haystack = [id, role, testId, aria, className].join(' ');
    const looksLikeList = /pane-side|chat-list|conversa|conversas|chat list|chats|grid|listbox/i.test(haystack);

    if (!looksLikeList && rowCount === 0) {
      return -9999;
    }

    let score = 0;
    if (id === 'pane-side') score += 400;
    if (/chat-list/i.test(testId)) score += 250;
    if (/chat list|lista de conversas|conversas|chats/i.test(aria)) score += 180;
    if (/grid|listbox/i.test(role)) score += 120;
    score += Math.min(rowCount, 25) * 10;

    if (element.matches('#side, aside, [data-testid="side"]')) {
      score -= 300;
    }

    return score;
  };

  const findBestContactList = (scope = document) => {
    const directPane = scope.querySelector?.('#pane-side');
    if (directPane instanceof HTMLElement) {
      return directPane;
    }

    const candidates = Array.from(scope.querySelectorAll?.(contactListSelector) || []).filter(isElement);
    const row = scope.querySelector?.(contactRowSelector);

    if (row instanceof HTMLElement) {
      let current = row.parentElement;
      while (current && current !== document.body && current.id !== 'app') {
        if (scoreContactList(current) > -9999) {
          candidates.push(current);
        }
        current = current.parentElement;
      }
    }

    return candidates
      .filter((candidate, index, all) => all.indexOf(candidate) === index)
      .sort((a, b) => scoreContactList(b) - scoreContactList(a))[0] || null;
  };

  const findContactsPane = () => {
    const sidebar = document.querySelector('#side, [data-testid="side"], aside');
    const contactList = findBestContactList(sidebar instanceof HTMLElement ? sidebar : document);
    if (!(contactList instanceof HTMLElement)) {
      return null;
    }

    if (sidebar instanceof HTMLElement && sidebar.contains(contactList)) {
      return { pane: sidebar, list: contactList };
    }

    return { pane: contactList, list: contactList };
  };

  const scoreChatPanel = (element) => {
    if (!isElement(element)) {
      return -9999;
    }

    if (element.closest('#side, [data-testid="side"], aside, #pane-side')) {
      return -9999;
    }

    const id = element.id || '';
    const role = element.getAttribute('role') || '';
    const testId = element.getAttribute('data-testid') || '';
    const aria = element.getAttribute('aria-label') || '';
    const tagName = element.tagName.toLowerCase();
    const haystack = [id, role, testId, aria, tagName].join(' ');

    if (element.matches('footer, form, [role="form"]')) {
      return -9999;
    }

    const hasHeader = Boolean(element.querySelector('header'));
    const hasComposer = Boolean(element.querySelector(chatTextboxSelector));
    let score = 0;
    if (id === 'main') score += 500;
    if (tagName === 'main') score += 240;
    if (/main/i.test(role)) score += 220;
    if (/conversation|chat|message|mensagem/i.test(testId)) score += 160;
    if (/conversation|chat|message|mensagem/i.test(aria)) score += 120;
    if (/main|conversation|chat|message|mensagem/i.test(haystack)) score += 80;
    if (hasHeader) score += 60;
    if (hasComposer) score += 180;
    if (hasHeader && hasComposer) score += 240;

    return score > 0 ? score : -9999;
  };

  const findBestChatPanel = () => {
    const composer = findChatTextbox(document);
    const directMain = document.querySelector('#main');
    if (directMain instanceof HTMLElement && (!(composer instanceof HTMLElement) || directMain.contains(composer))) {
      return directMain;
    }

    const candidates = Array.from(document.querySelectorAll(chatPanelSelector)).filter(isElement);
    if (directMain instanceof HTMLElement && !(composer instanceof HTMLElement)) {
      candidates.push(directMain);
    }

    if (composer instanceof HTMLElement) {
      let current = composer.parentElement;
      while (current && current !== document.body && current.id !== 'app') {
        if (scoreChatPanel(current) > -9999) {
          candidates.push(current);
        }
        current = current.parentElement;
      }
    }

    return candidates
      .filter((candidate, index, all) => all.indexOf(candidate) === index)
      .filter((candidate) => !(composer instanceof HTMLElement) || candidate.contains(composer))
      .map((candidate) => ({ candidate, score: scoreChatPanel(candidate) }))
      .filter((entry) => entry.score > -9999)
      .sort((a, b) => b.score - a.score)[0]?.candidate || null;
  };

  const findChatShell = (chatPanel) => {
    if (!isElement(chatPanel)) {
      return null;
    }

    let current = chatPanel.parentElement;
    while (current && current !== document.body && current.id !== 'app') {
      const hasSidebar = Boolean(current.querySelector('#side, [data-testid="side"], aside, #pane-side'));
      if (hasSidebar && current.contains(chatPanel)) {
        return current;
      }
      current = current.parentElement;
    }

    return chatPanel;
  };

  const findChatPane = () => {
    const chatPanel = findBestChatPanel();
    if (!(chatPanel instanceof HTMLElement)) {
      return null;
    }

    const shell = findChatShell(chatPanel);
    return shell instanceof HTMLElement ? { pane: shell, chat: chatPanel } : null;
  };

  const detachNode = (node, collection) => {
    if (
      !node ||
      node === state.stage ||
      !node.parentNode ||
      node.nodeType === Node.COMMENT_NODE
    ) {
      return;
    }

    if (
      collection === state.pruned &&
      requestedPanel === 'chat' &&
      isElement(node) &&
      isChatComposerPart(node)
    ) {
      return;
    }

    if (collection === state.detached && state.stage?.contains?.(node)) {
      return;
    }

    const marker = document.createComment('bitwhat-detached');
    collection.push({ node, placeholder: marker });
    node.parentNode.replaceChild(marker, node);
    state.vault.appendChild(node);
  };

  const pruneNode = (node) => {
    if (!isElement(node) || !node.parentNode || node === state.moved || node === state.contactList || node === state.chatPanel) {
      return;
    }

    if (state.contactList instanceof HTMLElement && state.contactList.contains(node)) {
      return;
    }

    if (
      requestedPanel !== 'contacts' &&
      state.chatPanel instanceof HTMLElement &&
      state.chatPanel.contains(node) &&
      (isChatComposerPart(node) ||
        node.matches('footer, footer *, [contenteditable="true"], [contenteditable="true"] *, textarea, textarea *, [role="textbox"], [role="textbox"] *'))
    ) {
      return;
    }

    detachNode(node, state.pruned);
  };

  const isolateDescendant = (container, keep, fillAttribute) => {
    if (!isElement(container) || !isElement(keep) || container === keep || !container.contains(keep)) {
      return;
    }

    Array.from(container.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) {
        return;
      }

      if (child === keep) {
        return;
      }

      if (child.contains(keep)) {
        child.setAttribute(fillAttribute, 'true');
        state.fillPath.push(child);
        isolateDescendant(child, keep, fillAttribute);
        return;
      }

      detachNode(child, state.pruned);
    });
  };

  const isolateDescendantConnected = (container, keep, fillAttribute) => {
    if (!isElement(container) || !isElement(keep) || container === keep || !container.contains(keep)) {
      return;
    }

    Array.from(container.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) {
        return;
      }

      if (child === keep) {
        return;
      }

      if (child.contains(keep)) {
        child.setAttribute(fillAttribute, 'true');
        state.fillPath.push(child);
        isolateDescendantConnected(child, keep, fillAttribute);
        return;
      }

      child.setAttribute('data-bitwhat-panel-hidden', 'true');
      state.hidden.push(child);
    });
  };

  const markContactPath = (shell, list) => {
    if (!isElement(shell) || !isElement(list)) {
      return;
    }

    shell.setAttribute('data-bitwhat-contacts-shell', 'true');
    list.setAttribute('data-bitwhat-contact-list', 'true');

    let current = list.parentElement;
    while (current && current !== shell && shell.contains(current)) {
      current.setAttribute('data-bitwhat-contacts-fill', 'true');
      state.fillPath.push(current);
      current = current.parentElement;
    }
  };

  const markChatPath = (shell, chatPanel) => {
    if (!isElement(shell) || !isElement(chatPanel)) {
      return;
    }

    shell.setAttribute('data-bitwhat-chat-shell', 'true');
    chatPanel.setAttribute('data-bitwhat-chat-panel', 'true');

    let current = chatPanel.parentElement;
    while (current && current !== shell && shell.contains(current)) {
      current.setAttribute('data-bitwhat-chat-fill', 'true');
      state.fillPath.push(current);
      current = current.parentElement;
    }
  };

  const findChatHeader = (chatPanel) => {
    if (!isElement(chatPanel)) {
      return null;
    }

    const directHeader = Array.from(chatPanel.children).find((child) => child instanceof HTMLElement && child.tagName === 'HEADER');
    if (directHeader instanceof HTMLElement) {
      return directHeader;
    }

    const header = chatPanel.querySelector('header');
    return header instanceof HTMLElement ? header : null;
  };

  const findChatComposer = (chatPanel) => {
    if (!isElement(chatPanel)) {
      return null;
    }

    const directFooter = Array.from(chatPanel.children).find((child) => child instanceof HTMLElement && child.tagName === 'FOOTER');
    if (directFooter instanceof HTMLElement) {
      return directFooter;
    }

    const textbox = findChatTextbox(chatPanel);

    if (!(textbox instanceof HTMLElement)) {
      return null;
    }

    const composer = textbox.closest('footer, form, [role="form"]');
    if (composer instanceof HTMLElement && chatPanel.contains(composer)) {
      return composer;
    }

    return textbox.parentElement instanceof HTMLElement ? textbox.parentElement : textbox;
  };

  const markChatComposer = (chatPanel, fallbackScope = chatPanel) => {
    const composer =
      findChatComposer(chatPanel) ||
      (isElement(fallbackScope) && fallbackScope !== chatPanel
        ? findChatComposer(fallbackScope)
        : null);
    if (composer instanceof HTMLElement) {
      composer.setAttribute('data-bitwhat-chat-composer', 'true');
      state.chatComposer = composer;
    }

    return composer;
  };

  const isChatComposerPart = (element) => {
    if (!isElement(element)) {
      return false;
    }

    const composer = state.chatComposer;
    if (composer instanceof HTMLElement && (element === composer || element.contains(composer) || composer.contains(element))) {
      return true;
    }

    return Boolean(
      element.matches('footer, form, [role="form"], [contenteditable="true"], textarea, [role="textbox"]') &&
        (element.matches(chatTextboxSelector) || element.querySelector(chatTextboxSelector))
    );
  };

  const findMessageScroll = (chatPanel, header, composer) => {
    if (!isElement(chatPanel)) {
      return null;
    }

    const messageSelector = [
      '[data-testid*="msg" i]',
      '[data-testid*="message" i]',
      '[data-id*="message" i]',
      '[data-id^="false_"]',
      '[data-id^="true_"]',
      '[data-pre-plain-text]',
      '[aria-label*="message" i]',
      '[aria-label*="mensagem" i]'
    ].join(',');

    const isOutsideChatEssentials = (element) => {
      if (!isElement(element) || element === header || element === composer || element === chatPanel) {
        return false;
      }

      if ((header instanceof HTMLElement && (header.contains(element) || element.contains(header)))) {
        return false;
      }

      if ((composer instanceof HTMLElement && (composer.contains(element) || element.contains(composer)))) {
        return false;
      }

      if (element.querySelector('footer, [contenteditable="true"], textarea, [role="textbox"]')) {
        return false;
      }

      return true;
    };

    const getChatPanelChild = (element) => {
      if (!isElement(element) || !chatPanel.contains(element)) {
        return null;
      }

      let current = element;
      while (current.parentElement && current.parentElement !== chatPanel) {
        current = current.parentElement;
      }

      return current.parentElement === chatPanel ? current : null;
    };

    const candidates = [];
    const addCandidate = (candidate, bonus = 0) => {
      if (!isElement(candidate) || !isOutsideChatEssentials(candidate) || candidates.some((entry) => entry.candidate === candidate)) {
        return;
      }

      candidates.push({ candidate, bonus });
    };

    Array.from(chatPanel.querySelectorAll(messageSelector)).filter(isElement).forEach((messageNode) => {
      if (
        (header instanceof HTMLElement && header.contains(messageNode)) ||
        (composer instanceof HTMLElement && composer.contains(messageNode))
      ) {
        return;
      }

      addCandidate(getChatPanelChild(messageNode), 320);

      let current = messageNode.parentElement;
      while (current && current !== chatPanel) {
        const style = window.getComputedStyle(current);
        if (/auto|scroll/i.test(style.overflowY) || current.scrollHeight > current.clientHeight + 12) {
          addCandidate(current, 220);
        }
        current = current.parentElement;
      }
    });

    Array.from(chatPanel.children).filter(isElement).forEach((child) => addCandidate(child, 120));
    Array.from(chatPanel.querySelectorAll('[role="application"], [tabindex], [data-testid*="conversation" i]'))
      .filter(isElement)
      .forEach((candidate) => addCandidate(candidate, 0));

    const scoreCandidate = (element) => {
      if (!isOutsideChatEssentials(element)) {
        return -9999;
      }

      let score = 0;
      const messageCount = element.querySelectorAll(messageSelector).length;
      if (messageCount > 0) score += 180 + Math.min(messageCount, 12) * 18;
      if (element.scrollHeight > element.clientHeight + 12) score += 80;

      const style = window.getComputedStyle(element);
      if (/auto|scroll/i.test(style.overflowY)) score += 40;

      const rect = element.getBoundingClientRect();
      score += Math.min(80, Math.round(rect.height / 8));
      if (element.parentElement === chatPanel) score += 90;

      return score;
    };

    return candidates
      .map(({ candidate, bonus }) => {
        const baseScore = scoreCandidate(candidate);
        return { candidate, score: baseScore > -9999 ? baseScore + bonus : baseScore };
      })
      .filter((entry) => entry.score > -9999)
      .sort((a, b) => b.score - a.score)[0]?.candidate || null;
  };

  const moveIntoMiniLayout = (node, layout) => {
    if (!isElement(node) || !isElement(layout)) {
      return false;
    }

    if (node.parentElement === layout) {
      return true;
    }

    if (!node.parentNode) {
      return false;
    }

    const marker = document.createComment('bitwhat-mini-placeholder');
    state.miniMoved.push({ node, placeholder: marker });
    node.parentNode.replaceChild(marker, node);
    layout.appendChild(node);
    return true;
  };

  const hasNestedMiniPart = (parts) =>
    parts.some((part, index) =>
      parts.some((other, otherIndex) => index !== otherIndex && part.contains(other))
    );

  const pruneMiniRemainder = (chatPanel, layout) => {
    Array.from(chatPanel.children).forEach((child) => {
      if (child === layout) {
        return;
      }

      detachNode(child, state.pruned);
    });
  };

  const scrollMiniMessagesToBottom = () => {
    const messageScroll = state.messageScroll;
    if (!(messageScroll instanceof HTMLElement)) {
      return;
    }

    window.requestAnimationFrame(() => {
      const scrollTargets = [
        messageScroll,
        ...Array.from(messageScroll.querySelectorAll('*')).filter(isElement)
      ].filter((element) => element.scrollHeight > element.clientHeight + 8);

      scrollTargets.forEach((element) => {
        element.scrollTop = element.scrollHeight;
      });
    });
  };

  const markMiniChatParts = (chatPanel) => {
    if (requestedPanel !== 'mini-chat' || !isElement(chatPanel)) {
      return false;
    }

    if (state.miniLayout instanceof HTMLElement && chatPanel.contains(state.miniLayout)) {
      chatPanel.setAttribute('data-bitwhat-mini-ready', 'true');
      scrollMiniMessagesToBottom();
      return true;
    }

    const header = findChatHeader(chatPanel);
    const composer = findChatComposer(chatPanel);
    const messageScroll = findMessageScroll(chatPanel, header, composer);

    if (!(header instanceof HTMLElement) || !(composer instanceof HTMLElement) || !(messageScroll instanceof HTMLElement)) {
      publishDiagnostic(
        'mini aguardando partes; header=' +
          describeElement(header) +
          '; mensagens=' +
          describeElement(messageScroll) +
          '; composer=' +
          describeElement(composer)
      );
      return false;
    }

    const miniParts = [header, messageScroll, composer];
    if (hasNestedMiniPart(miniParts)) {
      publishDiagnostic(
        'mini aguardando estrutura estavel; header=' +
          describeElement(header) +
          '; mensagens=' +
          describeElement(messageScroll) +
          '; composer=' +
          describeElement(composer)
      );
      return false;
    }

    const layout = document.createElement('section');
    layout.id = 'bitwhat-mini-chat-layout';
    layout.setAttribute('aria-label', 'Chat mini');
    chatPanel.appendChild(layout);

    state.miniLayout = layout;
    state.chatHeader = header;
    state.messageScroll = messageScroll;
    state.chatComposer = composer;

    header.setAttribute('data-bitwhat-chat-header', 'true');
    messageScroll.setAttribute('data-bitwhat-message-scroll', 'true');
    composer.setAttribute('data-bitwhat-chat-composer', 'true');

    const moved =
      moveIntoMiniLayout(header, layout) &&
      moveIntoMiniLayout(messageScroll, layout) &&
      moveIntoMiniLayout(composer, layout);

    if (!moved) {
      publishDiagnostic('mini aguardando movimentacao das partes do chat');
      return false;
    }

    pruneMiniRemainder(chatPanel, layout);
    chatPanel.setAttribute('data-bitwhat-mini-ready', 'true');
    scrollMiniMessagesToBottom();
    publishDiagnostic(
      'mini aplicado; header=' +
        describeElement(header) +
        '; mensagens=' +
        describeElement(messageScroll) +
        '; composer=' +
        describeElement(composer)
    );
    return true;
  };

  const removeWindowsDownloadFooter = (scope) => {
    if (!isElement(scope)) {
      return;
    }

    const textPattern = /baixar\\s+o\\s+whatsapp\\s+para\\s+windows|download\\s+whatsapp\\s+for\\s+windows|get\\s+whatsapp\\s+for\\s+windows|whatsapp\\s+para\\s+windows/i;
    const candidates = Array.from(scope.querySelectorAll('footer, a, [role="button"], span, div')).filter(isElement);

    candidates.forEach((element) => {
      if (element.closest('[data-id], [data-testid*="msg" i], [data-testid*="message" i], [role="row"]')) {
        return;
      }

      const text = (element.textContent || '').replace(/\\s+/g, ' ').trim();
      const aria = element.getAttribute('aria-label') || '';
      const title = element.getAttribute('title') || '';

      if (!textPattern.test([text, aria, title].join(' '))) {
        return;
      }

      const removable =
        element.closest('footer') ||
        element.closest('[data-testid*="download" i], [aria-label*="download" i], [aria-label*="baixar" i]') ||
        element;

      if (removable instanceof HTMLElement) {
        if (isChatComposerPart(removable) || removable.querySelector(chatTextboxSelector)) {
          return;
        }

        removable.setAttribute('data-bitwhat-download-footer', 'true');
        detachNode(removable, state.pruned);
      }
    });
  };

  const enforceExclusiveRoot = () => {
    const appRoot = state.appRoot || getAppRoot();
    if (!isElement(appRoot) || !state.stage) {
      return;
    }

    Array.from(appRoot.childNodes).forEach((child) => {
      if (child === state.stage || child.nodeType === Node.COMMENT_NODE) {
        return;
      }

      detachNode(child, state.detached);
    });
  };

  const applyStageStyle = (element) => {
    element.setAttribute('data-bitwhat-stage-child', 'true');
  };

  const pruneContactsPane = () => {
    const pane = state.moved;
    const list = state.contactList;
    if (!isElement(pane) || !isElement(list) || !state.stage?.contains?.(pane)) {
      return;
    }

    markContactPath(pane, list);
    isolateDescendant(pane, list, 'data-bitwhat-contacts-fill');
    removeWindowsDownloadFooter(pane);

    pane.querySelectorAll(
      [
        'header',
        'footer',
        'form',
        'input',
        'textarea',
        '[contenteditable="true"]',
        '[data-testid*="status" i]',
        '[aria-label*="status" i]',
        '[aria-label*="config" i]',
        '[aria-label*="settings" i]',
        '[aria-label*="menu" i]',
        '[data-icon="status"]',
        '[data-icon="menu"]',
        '[data-icon="settings"]'
      ].join(',')
    ).forEach(pruneNode);
  };

  const pruneChatPane = () => {
    const shell = state.moved;
    const main = state.chatPanel || state.moved;
    if (!isElement(shell) || !isElement(main) || !state.stage?.contains?.(shell)) {
      return;
    }

    markChatPath(shell, main);
    // Detect the composer before pruning so a composer rendered beside #main
    // is preserved. Do not wait for it, though: on WhatsApp's compact layout
    // the composer may only be mounted after the contacts pane is removed and
    // the conversation receives the full viewport width.
    if (requestedPanel === 'chat') {
      markChatComposer(main, shell);
    }
    isolateDescendant(shell, main, 'data-bitwhat-chat-fill');
    markMiniChatParts(main);
    if (requestedPanel === 'chat') {
      markChatComposer(main, shell);
    }
    removeWindowsDownloadFooter(main);

    if (requestedPanel === 'mini-chat') {
      return;
    }

    const header = main.querySelector('header');
    if (header instanceof HTMLElement) {
      Array.from(header.children).forEach((child, index) => {
        if (index > 0) {
          pruneNode(child);
        }
      });

      header
        .querySelectorAll(
          [
            'button[aria-label]',
            '[role="button"][aria-label]',
            '[data-icon="search"]',
            '[data-icon="menu"]',
            '[data-icon="more"]',
            '[data-icon="audio-call"]',
            '[data-icon="video-call"]'
          ].join(',')
        )
        .forEach((element) => {
          const action = element.closest('button, [role="button"], div');
          if (
            action instanceof HTMLElement &&
            action !== header.firstElementChild &&
            !header.firstElementChild?.contains(action) &&
            header.contains(action)
          ) {
            pruneNode(action);
          }
        });
    }
  };

  const refreshConnectedProjection = () => {
    const appRoot = state.appRoot;
    const pane = state.moved;
    if (!isElement(appRoot) || !isElement(pane) || !pane.isConnected) {
      return false;
    }

    clearHiddenAttributes(state.hidden);
    state.hidden = [];

    if (requestedPanel === 'contacts') {
      const list = state.contactList;
      if (!isElement(list) || !pane.contains(list)) {
        return false;
      }

      markContactPath(pane, list);
      isolateDescendantConnected(appRoot, pane, 'data-bitwhat-contacts-fill');
      return true;
    }

    const main = state.chatPanel;
    if (!isElement(main) || !pane.contains(main)) {
      return false;
    }

    markChatPath(pane, main);
    isolateDescendantConnected(appRoot, pane, 'data-bitwhat-chat-fill');
    isolateDescendantConnected(pane, main, 'data-bitwhat-chat-fill');
    markChatComposer(main, pane);
    return true;
  };

  const mountConnectedPanel = (activePane, contactList, chatPanel) => {
    if (!isElement(activePane) || !activePane.parentNode) {
      root.removeAttribute('data-bitwhat-panel');
      root.setAttribute('data-bitwhat-panel-pending', requestedPanel);
      publishDiagnostic('aguardando painel conectado ' + requestedPanel);
      return false;
    }

    const appRoot = getAppRoot();
    state.appRoot = appRoot;
    state.moved = activePane;
    state.contactList = contactList;
    state.chatPanel = chatPanel;
    state.connectedProjection = true;

    appRoot.setAttribute('data-bitwhat-connected-projection', 'true');
    root.removeAttribute('data-bitwhat-panel-pending');
    root.setAttribute('data-bitwhat-panel', requestedPanel);
    refreshConnectedProjection();
    publishDiagnostic(
      'painel conectado ' +
        requestedPanel +
        ' aplicado; shell=' +
        describeElement(activePane) +
        '; lista=' +
        describeElement(contactList) +
        '; chat=' +
        describeElement(chatPanel)
    );
    return true;
  };

  const mountPanel = (activePane, contactList, chatPanel) => {
    if (requestedPanel !== 'mini-chat') {
      return mountConnectedPanel(activePane, contactList, chatPanel);
    }

    if (!isElement(activePane) || !activePane.parentNode) {
      root.removeAttribute('data-bitwhat-panel');
      root.setAttribute('data-bitwhat-panel-pending', requestedPanel);
      publishDiagnostic('aguardando painel ' + requestedPanel);
      return false;
    }

    const appRoot = getAppRoot();
    const stage = document.createElement('section');
    const placeholder = document.createComment('bitwhat-panel-placeholder');

    stage.id = 'bitwhat-stage';
    stage.dataset.panel = requestedPanel;
    stage.setAttribute('aria-label', requestedPanel === 'contacts' ? 'Contatos' : requestedPanel === 'mini-chat' ? 'Chat mini' : 'Chat');

    state.appRoot = appRoot;
    state.stage = stage;
    state.moved = activePane;
    state.contactList = contactList;
    state.chatPanel = chatPanel;
    state.placeholder = placeholder;

    activePane.parentNode.replaceChild(placeholder, activePane);
    appRoot.appendChild(stage);
    stage.appendChild(activePane);
    applyStageStyle(activePane);
    root.removeAttribute('data-bitwhat-panel-pending');
    root.setAttribute('data-bitwhat-panel', requestedPanel);

    if (requestedPanel === 'contacts') {
      pruneContactsPane();
    } else {
      pruneChatPane();
    }

    enforceExclusiveRoot();
    publishDiagnostic(
      'painel ' +
        requestedPanel +
        ' aplicado; shell=' +
        describeElement(activePane) +
        '; lista=' +
        describeElement(contactList) +
        '; chat=' +
        describeElement(chatPanel)
    );
    return true;
  };

  const applyPanel = () => {
    if (state.connectedProjection) {
      return refreshConnectedProjection();
    }

    if (state.stage) {
      if (requestedPanel === 'contacts') {
        pruneContactsPane();
      } else {
        pruneChatPane();
      }
      enforceExclusiveRoot();
      return true;
    }

    if (requestedPanel === 'contacts') {
      const contacts = findContactsPane();
      return mountPanel(contacts?.pane, contacts?.list, undefined);
    }

    const chat = findChatPane();
    return mountPanel(chat?.pane, undefined, chat?.chat);
  };

  const onClick = (event) => {
    if (requestedPanel !== 'contacts') {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const contactList = state.contactList;
    if (!target || !(contactList instanceof HTMLElement) || !contactList.contains(target)) {
      return;
    }

    const row = target.closest(contactRowSelector + ', [tabindex]');
    if (!row || !contactList.contains(row)) {
      return;
    }

    window.setTimeout(() => {
      console.info(messagePrefix + 'chat');
    }, 160);
  };

  state.onClick = onClick;
  document.addEventListener('click', onClick, true);

  const observer = new MutationObserver(() => {
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(() => {
      applyPanel();
    }, 80);
  });

  state.observer = observer;
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  applyPanel();
})()
`
}
