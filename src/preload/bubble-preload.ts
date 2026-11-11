import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { IPC } from '../shared/ipc'

// Canais declarados aqui (e conferidos contra shared/ipc.ts pelo `satisfies`):
// importar o IPC em tempo de execução faria o bundler criar um arquivo
// compartilhado entre os preloads, e preloads em sandbox não podem carregar
// arquivos locais com require (o preload principal deixaria de funcionar).
const CHANNELS = {
  bubbleDragStart: 'bubble:drag-start',
  bubbleDragMove: 'bubble:drag-move',
  bubbleDragEnd: 'bubble:drag-end',
  bubbleClick: 'bubble:click',
  bubbleContextMenu: 'bubble:context-menu',
  bubbleUnread: 'bubble:unread'
} as const satisfies Pick<
  typeof IPC,
  'bubbleDragStart' | 'bubbleDragMove' | 'bubbleDragEnd' | 'bubbleClick' | 'bubbleContextMenu' | 'bubbleUnread'
>

// API mínima do balão flutuante: arrastar, clicar, menu e contador de não lidas.
contextBridge.exposeInMainWorld('bitWhatBubble', {
  dragStart: (offsetX: number, offsetY: number) => ipcRenderer.send(CHANNELS.bubbleDragStart, offsetX, offsetY),
  dragMove: (screenX: number, screenY: number) => ipcRenderer.send(CHANNELS.bubbleDragMove, screenX, screenY),
  dragEnd: () => ipcRenderer.send(CHANNELS.bubbleDragEnd),
  click: () => ipcRenderer.send(CHANNELS.bubbleClick),
  contextMenu: () => ipcRenderer.send(CHANNELS.bubbleContextMenu),
  onUnread: (callback: (count: number) => void) => {
    const listener = (_event: IpcRendererEvent, count: number): void => callback(count)
    ipcRenderer.on(CHANNELS.bubbleUnread, listener)
    return () => ipcRenderer.removeListener(CHANNELS.bubbleUnread, listener)
  }
})
