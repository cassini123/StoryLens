import { abandonSession } from './store'
import type { Session } from './types'

export function restartLocalSession(session: Session): void {
  abandonSession(session.participant_id)
  const short = /(?:\?|&)short=1\b/.test(window.location.hash)
  window.location.hash = short ? '#/participant?short=1' : '#/participant'
  window.location.reload()
}

export function openRestartConfirm(options: {
  message: string
  cancelLabel: string
  okLabel: string
  onConfirm: () => void
}): void {
  document.querySelectorAll('.confirm-overlay').forEach((node) => node.remove())
  const overlay = document.createElement('div')
  overlay.className = 'confirm-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  const card = document.createElement('div')
  card.className = 'confirm-card'
  const text = document.createElement('p')
  text.textContent = options.message
  const actions = document.createElement('div')
  actions.className = 'confirm-actions'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'btn'
  cancel.textContent = options.cancelLabel
  const ok = document.createElement('button')
  ok.type = 'button'
  ok.className = 'btn btn-fill'
  ok.textContent = options.okLabel
  const close = () => overlay.remove()
  cancel.addEventListener('click', close)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close()
  })
  ok.addEventListener('click', () => {
    close()
    options.onConfirm()
  })
  actions.append(cancel, ok)
  card.append(text, actions)
  overlay.append(card)
  document.body.append(overlay)
  ok.focus()
}
