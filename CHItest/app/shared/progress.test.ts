import { describe, expect, it } from 'vitest'
import { sessionProgress } from './progress'
import { emptyRuntime } from './sessionInit'
import { makeSession, makeTask } from './testSession'

describe('sessionProgress', () => {
  it('starts at 0% with T0–T3 empty when there is no session', () => {
    const progress = sessionProgress(null)
    expect(progress.percent).toBe(0)
    expect(progress.stages.map((item) => item.stage)).toEqual(['T0', 'T1', 'T2', 'T3'])
    expect(progress.stages.map((item) => item.total)).toEqual([1, 2, 2, 2])
    expect(progress.stages.every((item) => item.slots.every((slot) => slot === 'todo'))).toBe(true)
  })

  it('keeps intro at 0%', () => {
    expect(sessionProgress(makeSession()).percent).toBe(0)
  })

  it('marks the current T0 slot and reports a mid-task percent', () => {
    const current = sessionProgress(
      makeSession({
        runtime: { ...emptyRuntime(), step: 'describe', task_index: 0, draft_text: 'a room' },
      }),
    )
    expect(current.stages[0].slots).toEqual(['current'])
    expect(current.percent).toBeGreaterThan(0)
    expect(current.percent).toBeLessThan(20)
    expect(current.label).toBe('T0 1/7')
  })

  it('fills completed T0 and T1 before the first T2 task', () => {
    const base = makeSession()
    const tasks = base.tasks.map((item, index) => ({
      ...item,
      ended_at: index < 3 ? '2026-01-01T00:01:00.000Z' : '',
    }))
    const progress = sessionProgress(
      makeSession({
        tasks,
        runtime: { ...emptyRuntime(), step: 'describe', task_index: 3 },
      }),
    )
    expect(progress.stages[0].slots).toEqual(['done'])
    expect(progress.stages[1].slots).toEqual(['done', 'done'])
    expect(progress.stages[2].slots[0]).toBe('current')
    expect(progress.percent).toBeGreaterThan(40)
    expect(progress.percent).toBeLessThan(60)
  })

  it('omits T2 from the control-group bar', () => {
    const tasks = [
      makeTask({ stage: 'T0', task_id: 't0', ended_at: '2026-01-01T00:01:00.000Z', experimental_group: 'control' }),
      makeTask({ stage: 'T1', task_id: 't1a', block: 'early', ended_at: '2026-01-01T00:01:00.000Z', experimental_group: 'control' }),
      makeTask({ stage: 'T1', task_id: 't1b', block: 'early', ended_at: '2026-01-01T00:01:00.000Z', experimental_group: 'control' }),
      makeTask({ stage: 'T1', task_id: 't1c', block: 'middle', experimental_group: 'control' }),
      makeTask({ stage: 'T1', task_id: 't1d', block: 'middle', experimental_group: 'control' }),
      makeTask({ stage: 'T3', task_id: 't3a', block: 'transfer', experimental_group: 'control' }),
      makeTask({ stage: 'T3', task_id: 't3b', block: 'transfer', experimental_group: 'control' }),
    ]
    const progress = sessionProgress(
      makeSession({
        experimental_group: 'control',
        condition_order: tasks.map((item) => item.stage),
        tasks,
        runtime: { ...emptyRuntime(), step: 'describe', task_index: 3 },
      }),
    )
    expect(progress.stages.map((item) => item.stage)).toEqual(['T0', 'T1', 'T3'])
    expect(progress.stages[1].total).toBe(4)
    expect(progress.stages[1].slots[2]).toBe('current')
  })

  it('is 96% on the questionnaire and 100% when complete', () => {
    expect(sessionProgress(makeSession({ runtime: { ...emptyRuntime(), step: 'questionnaire' } })).percent).toBe(96)
    expect(sessionProgress(makeSession({ runtime: { ...emptyRuntime(), step: 'complete' } })).percent).toBe(100)
  })
})
