import { describe, expect, it } from 'vitest'
import {
  associatedGenerationRound,
  conditionOrderFor,
  normalizeSketchActionType,
  stageCapabilities,
} from './protocol'

describe('formal protocol helpers', () => {
  it('keeps two 7-task group orders', () => {
    expect(conditionOrderFor('scaffold')).toEqual(['T0', 'T1', 'T1', 'T2', 'T2', 'T3', 'T3'])
    expect(conditionOrderFor('control')).toEqual(['T0', 'T1', 'T1', 'T1', 'T1', 'T3', 'T3'])
  })

  it('disables AI, sketch, and auto prompt on T0', () => {
    expect(stageCapabilities('T0')).toEqual({
      ai_enabled: false,
      sketch_enabled: false,
      auto_prompt_enabled: false,
    })
    expect(stageCapabilities('T1').sketch_enabled).toBe(false)
    expect(stageCapabilities('T2').auto_prompt_enabled).toBe(true)
    expect(stageCapabilities('T3').auto_prompt_enabled).toBe(false)
  })

  it('normalizes sketch actions to the paper taxonomy', () => {
    expect(normalizeSketchActionType('move_subject')).toBe('move')
    expect(normalizeSketchActionType('add_object')).toBe('add')
    expect(normalizeSketchActionType('gaze_add')).toBe('change_gaze')
    expect(normalizeSketchActionType('movement_update')).toBe('change_direction')
    expect(normalizeSketchActionType('camera_distance')).toBe('change_distance')
  })

  it('associates prep and post-generation sketch with the next generation round', () => {
    expect(associatedGenerationRound(0)).toBe(1)
    expect(associatedGenerationRound(1)).toBe(2)
    expect(associatedGenerationRound(2)).toBe(3)
  })
})
