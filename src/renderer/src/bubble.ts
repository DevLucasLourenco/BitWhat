// Balão flutuante: arrastar move a janela (o processo principal posiciona),
// clique sem arrastar abre/oculta o BitWhat, botão direito abre o menu.

interface BitWhatBubbleApi {
  dragStart: (offsetX: number, offsetY: number) => void
  dragMove: (screenX: number, screenY: number) => void
  dragEnd: () => void
  click: () => void
  contextMenu: () => void
  onUnread: (callback: (count: number) => void) => () => void
}

declare global {
  interface Window {
    bitWhatBubble: BitWhatBubbleApi
  }
}

// Movimento mínimo (px) para tratar como arrasto e não como clique.
const DRAG_THRESHOLD = 4

const api = window.bitWhatBubble
const bubble = document.getElementById('bubble') as HTMLElement
const badge = document.getElementById('badge') as HTMLElement

let pointerId: number | null = null
let startX = 0
let startY = 0
// Ponto do balão onde o ponteiro pegou (fica fixo sob o cursor ao arrastar).
let grabX = 0
let grabY = 0
let dragging = false

bubble.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return
  }
  pointerId = event.pointerId
  startX = event.screenX
  startY = event.screenY
  grabX = event.clientX
  grabY = event.clientY
  dragging = false
  bubble.setPointerCapture(event.pointerId)
})

bubble.addEventListener('pointermove', (event) => {
  if (event.pointerId !== pointerId) {
    return
  }
  if (!dragging) {
    if (Math.hypot(event.screenX - startX, event.screenY - startY) < DRAG_THRESHOLD) {
      return
    }
    dragging = true
    bubble.classList.add('dragging')
    api.dragStart(grabX, grabY)
  }
  api.dragMove(event.screenX, event.screenY)
})

const finish = (event: PointerEvent): void => {
  if (event.pointerId !== pointerId) {
    return
  }
  pointerId = null
  bubble.classList.remove('dragging')
  if (dragging) {
    dragging = false
    api.dragEnd()
    return
  }
  if (event.type === 'pointerup') {
    api.click()
  }
}

bubble.addEventListener('pointerup', finish)
bubble.addEventListener('pointercancel', finish)

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
  api.contextMenu()
})

api.onUnread((count) => {
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count)
    badge.hidden = false
    bubble.setAttribute('aria-label', `Abrir BitWhat — ${count} não lidas`)
  } else {
    badge.hidden = true
    bubble.setAttribute('aria-label', 'Abrir BitWhat')
  }
})

export {}
