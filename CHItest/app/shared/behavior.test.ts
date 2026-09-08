import { describe, expect, it } from 'vitest'
import { measuresForTask } from './behavior'
import { makeSession, makeTask } from './testSession'
import type { TimelineEvent } from './types'

function event(partial: Partial<TimelineEvent> & Pick<TimelineEvent, 'event_type' | 'relative_time_ms'>): TimelineEvent {
  return {
    event_id: `evt_${partial.event_type}_${partial.relative_time_ms}`,
    participant_id: 'P001',
    session_id: 'S001',
    task_id: 't1a',
    stage: 'T1',
    round: 1,
    timestamp: '2026-01-01T00:00:00.000Z',
    payload: {},
    ...partial,
  }
}

describe('satisfaction and auto-prompt view measures', () => {
  it('derives round_of_satisfaction and time_to_satisfaction from satisfied_click', () => {
    const task = makeTask({
      stage: 'T1',
      task_id: 't1a',
      block: 'early',
      started_at: '2026-01-01T00:00:00.000Z',
      ended_at: '2026-01-01T00:01:00.000Z',
      satisfied_round: null,
    })
    const session = makeSession({
      tasks: [task],
      event_log: [
        event({ event_type: 'task_start', relative_time_ms: 0 }),
        event({ event_type: 'satisfied_click', relative_time_ms: 40000, round: 2, payload: { round: 2 } }),
        event({ event_type: 'task_end', relative_time_ms: 41000 }),
      ],
    })
    const measures = measuresForTask(session, task)
    expect(measures.round_of_satisfaction).toBe(2)
    expect(measures.time_to_satisfaction).toBe(40000)
    expect(measures.task_time).toBe(40000)
  })

  it('sums paired auto_prompt_view_start/end sessions instead of returning 0', () => {
    const task = makeTask({ stage: 'T2', task_id: 't2a', block: 'middle' })
    const session = makeSession({
      tasks: [task],
      event_log: [
        event({ event_type: 'task_start', task_id: 't2a', stage: 'T2', relative_time_ms: 0 }),
        event({ event_type: 'auto_prompt_view_start', task_id: 't2a', stage: 'T2', relative_time_ms: 10000 }),
        event({ event_type: 'auto_prompt_view_end', task_id: 't2a', stage: 'T2', relative_time_ms: 16000 }),
        event({ event_type: 'auto_prompt_view_start', task_id: 't2a', stage: 'T2', relative_time_ms: 20000 }),
        event({ event_type: 'auto_prompt_view_end', task_id: 't2a', stage: 'T2', relative_time_ms: 25000 }),
      ],
    })
    expect(measuresForTask(session, task).auto_prompt_view_time).toBe(11000)
    expect(measuresForTask(session, task).auto_prompt_view_time_ms).toBe(11000)
  })
})
