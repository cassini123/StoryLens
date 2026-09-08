import { describe, expect, it } from 'vitest'
import { decorateAction } from './actions'
import { templateForTask } from './templates'

describe('applySketchAction', () => {
  it('moves a subject and logs before/after', () => {
    const scene = templateForTask('T01')
    const person = scene.subjects[0]
    const { scene: next, action } = decorateAction(scene, {
      action: 'move',
      target: person.id,
      from: { x: person.x, y: person.y },
      to: { x: 310, y: 210 },
    })
    const moved = next.subjects.find((item) => item.id === person.id)
    expect(moved?.x).toBe(310)
    expect(moved?.y).toBe(210)
    expect(scene.subjects[0].x).toBe(person.x)
    expect(action.action_type).toBe('move')
    expect(action.target_id).toBe(person.id)
    expect(action.before_state).toBeTruthy()
    expect(action.after_state).toBeTruthy()
  })

  it('adds and deletes a person', () => {
    const scene = templateForTask('T01')
    const added = decorateAction(scene, {
      action: 'add',
      target: 'person',
      to: { x: 100, y: 100 },
    }).scene
    expect(added.subjects).toHaveLength(scene.subjects.length + 1)
    const created = added.subjects.at(-1)
    const deleted = decorateAction(added, {
      action: 'delete',
      target: created!.id,
    }).scene
    expect(deleted.subjects).toHaveLength(scene.subjects.length)
  })

  it('moves and rotates the camera', () => {
    const scene = templateForTask('T03')
    const moved = decorateAction(scene, {
      action: 'camera_move',
      target: 'camera',
      from: { x: scene.camera.x, y: scene.camera.y },
      to: { x: 40, y: 40 },
    }).scene
    expect(moved.camera.x).toBe(40)
    const rotated = decorateAction(moved, {
      action: 'camera_rotate',
      target: 'camera',
      from: moved.camera.rotation,
      to: 45,
    }).scene
    expect(rotated.camera.rotation).toBe(45)
  })

  it('adds gaze and movement and updates movement direction', () => {
    const scene = templateForTask('T07')
    const withGaze = decorateAction(scene, {
      action: 'gaze_add',
      target: 'person_01',
      to: { toId: 'person_02', to: null },
    }).scene
    expect(withGaze.gazes.some((item) => item.from === 'person_01' && item.toId === 'person_02')).toBe(true)
    const withMove = decorateAction(withGaze, {
      action: 'movement_add',
      target: 'person_01',
      to: { x: 400, y: 200 },
    }).scene
    const movement = withMove.movements.at(-1)
    expect(movement?.to).toEqual({ x: 400, y: 200 })
    const updated = decorateAction(withMove, {
      action: 'movement_update',
      target: movement!.id,
      to: { x: 10, y: 20 },
    }).scene
    expect(updated.movements.find((item) => item.id === movement!.id)?.to).toEqual({ x: 10, y: 20 })
  })
})
