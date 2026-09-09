import { describe, expect, it } from 'vitest'
import { hydrateRuntimeForTask, stashTaskDraft } from './sessionInit'
import { makeGeneration, makeSession, makeTask, makeText } from './testSession'

describe('task switching runtime', () => {
  it('restores the destination task draft and last successful image', () => {
    const t1 = makeTask({ stage: 'T1', task_id: 't1a', image_id: 'E01', round: 3, final_text: 'walk left', ended_at: '2026-01-01T00:02:00.000Z' })
    const t2 = makeTask({ stage: 'T2', task_id: 't2a', image_id: 'C04', round: 3, final_text: 'look at the sea' })
    const session = makeSession({
      tasks: [t1, t2],
      text_versions: [makeText({ text_version_id: 'txt1', task_id: 't1a', text_type: 'refined', text: 'walk left' })],
      generations: [
        makeGeneration({ generation_id: 'g1', task_id: 't1a', round: 3, output_image_id: 'g1' }),
        makeGeneration({ generation_id: 'g2', task_id: 't2a', round: 3, success: false, error: 'API Concurrent Limit', output_image_id: '' }),
      ],
    })
    session.runtime.task_index = 1
    session.runtime.draft_text = 'look at the sea'
    session.runtime.round = 3
    stashTaskDraft(session)
    hydrateRuntimeForTask(session, 0)
    expect(session.runtime.task_index).toBe(0)
    expect(session.runtime.draft_text).toBe('walk left')
    expect(session.runtime.last_output_image_id).toBe('g1')
    expect(session.runtime.step).toBe('review')
    expect(session.runtime.round).toBe(3)
    expect(t2.final_text).toBe('look at the sea')
  })

  it('keeps a failed T2 reopenable without consuming a new start', () => {
    const task = makeTask({ stage: 'T2', task_id: 't2a', image_id: 'C04', round: 3, started_at: '2026-01-01T00:01:00.000Z', final_text: 'near the rail' })
    const session = makeSession({
      tasks: [task],
      generations: [
        makeGeneration({ generation_id: 'fail', task_id: 't2a', round: 3, success: false, error: 'API Concurrent Limit', output_image_id: '' }),
      ],
    })
    hydrateRuntimeForTask(session, 0)
    expect(session.runtime.step).toBe('describe')
    expect(session.runtime.last_output_image_id).toBe('')
    expect(session.runtime.generate_error).toMatch(/Concurrent/)
    expect(session.runtime.draft_text).toBe('near the rail')
  })
})
