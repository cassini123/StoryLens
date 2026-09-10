import { describe, expect, it } from 'vitest'
import { makeGeneration, makeSession, makeTask } from './testSession'
import {
  associatedGenerationRound,
  canAttemptGeneration,
  canAttemptInterpret,
  canSatisfyTask,
  recoverStuckGeneration,
  conditionOrderFor,
  normalizeSketchActionType,
  stageCapabilities,
  t2ScaffoldLoopComplete,
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

  it('blocks T2 satisfaction until interpret + chained generation', () => {
    const session = makeSession({
      tasks: [makeTask({ stage: 'T2', task_id: 't2a', image_id: 'C01' })],
      generations: [
        makeGeneration({ generation_id: 'g1', task_id: 't2a', round: 1, stage: 'T2', input_image_id: 'C01', output_image_id: 'g1' }),
      ],
    })
    expect(canSatisfyTask(session, session.tasks[0], 'hello')).toBe(false)
    expect(t2ScaffoldLoopComplete(session, session.tasks[0])).toBe(false)
  })

  it('lets a participant retry generate after failed rounds at the cap', () => {
    const task = makeTask({ stage: 'T2', task_id: 't2a', image_id: 'C01' })
    const session = makeSession({
      tasks: [task],
      generations: [
        makeGeneration({
          generation_id: 'g1',
          task_id: 't2a',
          round: 3,
          stage: 'T2',
          success: false,
          output_image_id: '',
        }),
      ],
    })
    session.runtime.round = 3
    session.runtime.step = 'describe'
    session.runtime.working_scene = { nodes: [] } as never
    expect(canAttemptGeneration(session, task)).toBe(true)
    expect(canAttemptInterpret(session, task)).toBe(true)
    expect(canSatisfyTask(session, task, 'hello')).toBe(false)
  })

  it('rolls back an unrecorded hung generate so the participant can retry', () => {
    const task = makeTask({ stage: 'T1', task_id: 't1a', image_id: 'E01' })
    const session = makeSession({ tasks: [task] })
    session.runtime.round = 1
    session.runtime.step = 'generating'
    task.round = 1
    expect(recoverStuckGeneration(session)).toBe(true)
    expect(session.runtime.step).toBe('describe')
    expect(session.runtime.round).toBe(0)
    expect(task.round).toBe(0)
    expect(canAttemptGeneration(session, task)).toBe(true)
  })

  it('keeps a previous image when recovering a hung later round', () => {
    const task = makeTask({ stage: 'T1', task_id: 't1a', image_id: 'E01' })
    const session = makeSession({
      tasks: [task],
      generations: [makeGeneration({ generation_id: 'g1', task_id: 't1a', round: 1 })],
    })
    session.runtime.round = 2
    session.runtime.step = 'generating'
    session.runtime.last_output_image_id = 'g1'
    task.round = 2
    expect(recoverStuckGeneration(session)).toBe(true)
    expect(session.runtime.step).toBe('review')
    expect(session.runtime.round).toBe(1)
    expect(session.runtime.last_output_image_id).toBe('g1')
    expect(canAttemptGeneration(session, task)).toBe(true)
  })

  it('keeps Interpret Sketch available on T2 even before the first round', () => {
    const task = makeTask({ stage: 'T2', task_id: 't2a', image_id: 'C01' })
    const session = makeSession({ tasks: [task] })
    session.runtime.round = 0
    session.runtime.step = 'describe'
    session.runtime.working_scene = { nodes: [] } as never
    expect(canAttemptInterpret(session, task)).toBe(true)
  })
})
