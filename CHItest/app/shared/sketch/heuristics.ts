import type { SketchScene } from '../types'
import { cloneScene } from './templates'

export function applyIntentHeuristics(scene: SketchScene, intent: string): SketchScene {
  const next = cloneScene(scene)
  const text = intent.toLowerCase()

  if (/\b(alone|only one|single person|one person)\b/.test(text) && next.subjects.length > 1) {
    next.subjects = next.subjects.slice(0, 1)
    next.gazes = next.gazes.filter((gaze) => next.subjects.some((s) => s.id === gaze.from || s.id === gaze.toId))
    next.movements = next.movements.filter((move) => next.subjects.some((s) => s.id === move.from))
  }

  if (/\bwindow\b/.test(text) && !next.objects.some((obj) => obj.kind === 'window')) {
    next.objects.push({
      id: 'object_window',
      kind: 'window',
      label: 'window',
      x: 560,
      y: 70,
      w: 130,
      h: 110,
    })
  }

  if (/\bdoor\b/.test(text) && !next.objects.some((obj) => obj.kind === 'door')) {
    next.objects.push({
      id: 'object_door',
      kind: 'door',
      label: 'door',
      x: 40,
      y: 150,
      w: 50,
      h: 160,
    })
  }

  if (/\bbehind\b/.test(text)) {
    next.camera.y = Math.min(430, next.camera.y + 10)
  }

  return next
}
