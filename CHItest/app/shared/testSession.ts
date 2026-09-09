import { emptyRuntime, emptyTask } from './sessionInit'
import { TASK_SEQUENCE_VERSION } from './types'
import type { GenerationRecord, Session, TaskRun, TextVersion } from './types'

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
    source: partial.text_type === 'auto' || partial.text_type === 'auto_interpretation' ? 'system' : 'user',
    text_length: partial.text.length,
    ...partial,
  }
}

export function makeGeneration(partial: Partial<GenerationRecord> & Pick<GenerationRecord, 'generation_id' | 'task_id' | 'round'>): GenerationRecord {
  return {
    participant_id: 'P001',
    session_id: 'S001',
    stage: 'T1',
    timestamp_start: '2026-01-01T00:00:10.000Z',
    timestamp_end: '2026-01-01T00:00:12.000Z',
    latency_ms: 2000,
    model: 'jimeng',
    model_version: 'jimeng_t2i_v40',
    input_image_id: 'E01',
    previous_generation_id: null,
    generation_input_chain_valid: true,
    input_text: 'prompt',
    input_text_version_id: 'txt',
    input_sketch_snapshot_id: '',
    source_sketch_snapshot_id: '',
    auto_prompt_id: '',
    user_prompt_version_id: 'txt',
    sketch_sent: false,
    api_input: 'image+text',
    api_payload: { prompt: 'prompt', sketch_sent: false, api_input: 'image+text' },
    output_image_id: partial.generation_id,
    success: true,
    error: '',
    meta: {
      engine: 'jimeng',
      prompt: 'prompt',
      timestamp: '2026-01-01T00:00:12.000Z',
      jimeng_task_id: 'x',
      status: 'done',
      error: '',
    },
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
    session_status: 'in_progress',
    completion_status: 'incomplete',
    last_completed_task_id: null,
    current_task_id: tasks[0]?.task_id ?? null,
    current_stage: tasks[0]?.stage ?? null,
    current_round: 0,
    current_generation_id: null,
    current_text_version_id: null,
    current_sketch_snapshot_id: null,
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
