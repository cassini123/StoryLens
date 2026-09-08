import { describe, expect, it } from 'vitest'
import { sessionProgress } from './progress'
import type { Session, SessionRuntime, TaskRun } from './types'

function task(stage: TaskRun['stage'], ended: boolean, id: string): TaskRun {
  return {
    participant_id: 'P001',
    session_id: 'S001',
    task_id: id,
    image_id: id,
    stage,
    round: 0,
    rounds: [],
    initial_text_version_id: '',
    final_text_version_id: '',
    satisfied_round: null,
    started_at: ended ? '2026-01-01T00:00:00.000Z' : '',
    ended_at: ended ? '2026-01-01T00:01:00.000Z' : '',
    sketch_actions: [],
  }
}

function runtime(partial: Partial<SessionRuntime>): SessionRuntime {
  return {
    step: 'intro',
    task_index: 0,
    round: 0,
    draft_text: '',
    auto_prompt: '',
    auto_prompt_id: '',
    user_prompt_started: false,
    auto_prompt_view_started: false,
    working_scene: null,
    baseline_scene: null,
    generate_error: '',
    selected_node_id: null,
    last_output_image_id: '',
    text_started: false,
    sketch_editing: false,
    ...partial,
  }
}

function session(partial: Partial<Session> = {}): Session {
  return {
    participant_id: 'P001',
    session_id: 'S001',
    assignment_pattern: 'A',
    demographics: {
      cinematography_experience: 'none',
      cinematography_years: '0',
      visual_experience: 'none',
      ai_familiarity: 'none',
      design_background: false,
      film_background: false,
      film_years: '0',
      ai_experience: 'none',
      image_gen_experience: 'none',
    },
    tasks: [
      task('T0', false, 't0'),
      task('T1', false, 't1a'),
      task('T1', false, 't1b'),
      task('T2', false, 't2a'),
      task('T2', false, 't2b'),
      task('T3', false, 't3a'),
      task('T3', false, 't3b'),
    ],
    event_log: [],
    text_versions: [],
    generations: [],
    sketch_snapshots: [],
    subjective: null,
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    runtime: runtime({}),
    seq: 0,
    ...partial,
  }
}

describe('sessionProgress', () => {
  it('starts at 0% with T0–T3 empty when there is no session', () => {
    const progress = sessionProgress(null)
    expect(progress.percent).toBe(0)
    expect(progress.stages.map((item) => item.stage)).toEqual(['T0', 'T1', 'T2', 'T3'])
    expect(progress.stages.map((item) => item.total)).toEqual([1, 2, 2, 2])
    expect(progress.stages.every((item) => item.slots.every((slot) => slot === 'todo'))).toBe(true)
  })

  it('keeps intro at 0%', () => {
    expect(sessionProgress(session()).percent).toBe(0)
  })

  it('marks the current T0 slot and reports a mid-task percent', () => {
    const progress = sessionProgress(
      session({
        runtime: runtime({ step: 'describe', task_index: 0, draft_text: 'a room' }),
      }),
    )
    expect(progress.stages[0].slots).toEqual(['current'])
    expect(progress.percent).toBeGreaterThan(0)
    expect(progress.percent).toBeLessThan(20)
    expect(progress.label).toBe('T0 1/7')
  })

  it('fills completed T0 and T1 before the first T2 task', () => {
    const tasks = session().tasks.map((item, index) => ({
      ...item,
      ended_at: index < 3 ? '2026-01-01T00:01:00.000Z' : '',
    }))
    const progress = sessionProgress(
      session({
        tasks,
        runtime: runtime({ step: 'describe', task_index: 3 }),
      }),
    )
    expect(progress.stages[0].slots).toEqual(['done'])
    expect(progress.stages[1].slots).toEqual(['done', 'done'])
    expect(progress.stages[2].slots[0]).toBe('current')
    expect(progress.percent).toBeGreaterThan(40)
    expect(progress.percent).toBeLessThan(60)
  })

  it('is 96% on the questionnaire and 100% when complete', () => {
    expect(sessionProgress(session({ runtime: runtime({ step: 'questionnaire' }) })).percent).toBe(96)
    expect(sessionProgress(session({ runtime: runtime({ step: 'complete' }) })).percent).toBe(100)
  })
})
