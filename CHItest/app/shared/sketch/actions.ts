import type { Point, SketchAction, SketchScene, SubjectNode } from '../types'
import { cloneScene } from './templates'

function nextId(prefix: string, existing: string[]): string {
  let n = 1
  while (existing.includes(`${prefix}_${String(n).padStart(2, '0')}`)) n += 1
  return `${prefix}_${String(n).padStart(2, '0')}`
}

function findSubject(scene: SketchScene, id: string): SubjectNode | undefined {
  return scene.subjects.find((item) => item.id === id)
}

export function applySketchAction(scene: SketchScene, action: SketchAction): SketchScene {
  const next = cloneScene(scene)
  const { action: kind, target } = action

  if (kind === 'move' || kind === 'move_subject') {
    const subject = findSubject(next, target)
    const point = action.to as Point | undefined
    if (subject && point) {
      subject.x = point.x
      subject.y = point.y
    }
    return next
  }

  if (kind === 'move_object') {
    const object = next.objects.find((item) => item.id === target)
    const point = action.to as Point | undefined
    if (object && point) {
      object.x = point.x
      object.y = point.y
    }
    return next
  }

  if (kind === 'rotate' || kind === 'rotate_subject') {
    const subject = findSubject(next, target)
    if (subject && typeof action.to === 'number') subject.rotation = action.to
    return next
  }

  if (kind === 'camera_move') {
    const point = action.to as Point | undefined
    if (point) {
      next.camera.x = point.x
      next.camera.y = point.y
    }
    return next
  }

  if (kind === 'camera_rotate') {
    if (typeof action.to === 'number') next.camera.rotation = action.to
    return next
  }

  if (kind === 'add' || kind === 'add_subject') {
    const point = (action.to as Point | undefined) ?? { x: 400, y: 260 }
    const id = nextId('person', next.subjects.map((item) => item.id))
    const label = String.fromCharCode(65 + next.subjects.length)
    next.subjects.push({
      id,
      label,
      x: point.x,
      y: point.y,
      rotation: 0,
      scale: 1,
    })
    return next
  }

  if (kind === 'add_object') {
    const point = (action.to as Point | undefined) ?? { x: 360, y: 140 }
    const id = nextId('object', next.objects.map((item) => item.id))
    next.objects.push({
      id,
      kind: 'object',
      label: 'object',
      x: point.x - 30,
      y: point.y - 20,
      w: 80,
      h: 50,
    })
    return next
  }

  if (kind === 'delete' || kind === 'delete_subject') {
    next.subjects = next.subjects.filter((item) => item.id !== target)
    next.gazes = next.gazes.filter((item) => item.from !== target && item.toId !== target)
    next.movements = next.movements.filter((item) => item.from !== target)
    return next
  }

  if (kind === 'delete_object') {
    next.objects = next.objects.filter((item) => item.id !== target)
    return next
  }

  if (kind === 'gaze_add') {
    const to = action.to as { toId?: string | null; to?: Point | null }
    const id = nextId('gaze', next.gazes.map((item) => item.id))
    next.gazes.push({
      id,
      from: target,
      toId: to?.toId ?? null,
      to: to?.to ?? null,
    })
    return next
  }

  if (kind === 'gaze_delete') {
    next.gazes = next.gazes.filter((item) => item.id !== target)
    return next
  }

  if (kind === 'movement_add') {
    const point = action.to as Point
    const id = nextId('movement', next.movements.map((item) => item.id))
    next.movements.push({ id, from: target, to: point })
    return next
  }

  if (kind === 'movement_delete') {
    next.movements = next.movements.filter((item) => item.id !== target)
    return next
  }

  return next
}

export function nodeCenter(scene: SketchScene, id: string): Point | null {
  if (id === 'camera') return { x: scene.camera.x, y: scene.camera.y }
  const subject = findSubject(scene, id)
  if (subject) return { x: subject.x, y: subject.y }
  const object = scene.objects.find((item) => item.id === id)
  if (object) return { x: object.x + object.w / 2, y: object.y + object.h / 2 }
  return null
}
