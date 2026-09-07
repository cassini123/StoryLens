import { describe, expect, it } from 'vitest'
import { applySketchAction } from './actions'
import { templateForTask } from './templates'

describe('applySketchAction', () => {
  it('moves a subject', () => {
    const scene = templateForTask('T01')
    const person = scene.subjects[0]
    const next = applySketchAction(scene, {
      action: 'move',
      target: person.id,
      from: { x: person.x, y: person.y },
      to: { x: 310, y: 210 },
      timestamp: 1,
    })
    const moved = next.subjects.find((item) => item.id === person.id)
    expect(moved?.x).toBe(310)
    expect(moved?.y).toBe(210)
    expect(scene.subjects[0].x).toBe(person.x)
  })

  it('adds and deletes a person', () => {
    const scene = templateForTask('T01')
    const added = applySketchAction(scene, {
      action: 'add',
      target: 'person',
      to: { x: 100, y: 100 },
      timestamp: 1,
    })
    expect(added.subjects).toHaveLength(scene.subjects.length + 1)
    const created = added.subjects.at(-1)
    const deleted = applySketchAction(added, {
      action: 'delete',
      target: created!.id,
      timestamp: 2,
    })
    expect(deleted.subjects).toHaveLength(scene.subjects.length)
  })

  it('moves and rotates the camera', () => {
    const scene = templateForTask('T03')
    const moved = applySketchAction(scene, {
      action: 'camera_move',
      target: 'camera',
      from: { x: scene.camera.x, y: scene.camera.y },
      to: { x: 40, y: 40 },
      timestamp: 1,
    })
    expect(moved.camera.x).toBe(40)
    const rotated = applySketchAction(moved, {
      action: 'camera_rotate',
      target: 'camera',
      from: moved.camera.rotation,
      to: 45,
      timestamp: 2,
    })
    expect(rotated.camera.rotation).toBe(45)
  })

  it('adds gaze and movement', () => {
    const scene = templateForTask('T07')
    const withGaze = applySketchAction(scene, {
      action: 'gaze_add',
      target: 'person_01',
      to: { toId: 'person_02', to: null },
      timestamp: 1,
    })
    expect(withGaze.gazes.some((item) => item.from === 'person_01' && item.toId === 'person_02')).toBe(true)
    const withMove = applySketchAction(withGaze, {
      action: 'movement_add',
      target: 'person_01',
      to: { x: 400, y: 200 },
      timestamp: 2,
    })
    expect(withMove.movements[0]?.to).toEqual({ x: 400, y: 200 })
  })
})
