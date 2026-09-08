import { emptyRuntime, emptyTask } from './sessionInit'
import { TASK_SEQUENCE_VERSION } from './types'
import type { Session, TaskRun, TextVersion } from './types'

export function makeTask(partial: Partial<TaskRun> & Pick<TaskRun, 'stage' | 'task_id'>): TaskRun {
  const planned = {
    task_id: partial.task_id,
    image_id: partial.image_id || partial.task_id,
    stage: partial.stage,
    block: partial.block || (partial.stage === 'T0' ? 'baseline' : partial.stage === 'T1' ? 'early' : partial.stage === 'T2' ? 'middle' : 'transfer'),
  }
  return {
    ...emptyTask('S001', 'P001', planned, partial.experimental_group || 'scaffold'),
    ...partial,
  }
}

export function makeText(partial: Partial<TextVersion> & Pick<TextVersion, 'text_version_id' | 'text_type' | 'text'>): TextVersion {
  return {
    participant_id: 'P001',
    session_id: 'S001',
    task_id: 't2a',
    stage: 'T2',
    round: 1,
    timestamp: '2026-01-01T00:02:00.000Z',
    previous_text_version_id: '',
    source: partial.text_type === 'auto' ? 'system' : 'user',
    text_length: partial.text.length,
    ...partial,
  }
}

export function makeSession(partial: Partial<Session> = {}): Session {
  const { tasks: overrideTasks, ...rest } = partial
  const tasks = overrideTasks ?? [
    makeTask({ stage: 'T0', task_id: 't0' }),
    makeTask({ stage: 'T1', task_id: 't1a', block: 'early' }),
    makeTask({ stage: 'T1', task_id: 't1b', block: 'early' }),
    makeTask({ stage: 'T2', task_id: 't2a', block: 'middle' }),
    makeTask({ stage: 'T2', task_id: 't2b', block: 'middle' }),
    makeTask({ stage: 'T3', task_id: 't3a', block: 'transfer' }),
    makeTask({ stage: 'T3', task_id: 't3b', block: 'transfer' }),
  ]
  return {
    participant_id: 'P001',
    session_id: 'S001',
    assignment_pattern: 'A',
    experimental_group: 'scaffold',
    condition_order: tasks.map((item) => item.stage),
    task_sequence_version: TASK_SEQUENCE_VERSION,
    short_session: false,
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
    event_log: [],
    text_versions: [],
    generations: [],
    sketch_snapshots: [],
    auto_prompts: [],
    subjective: null,
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    export_ready: false,
    validation: null,
    runtime: emptyRuntime(),
    seq: 0,
    ...rest,
    tasks,
  }
}
