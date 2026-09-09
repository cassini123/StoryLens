import { measuresForTask } from './behavior'
import { getImage } from './config'
import { lastSuccessfulGeneration } from './generationChain'
import { isSystemTextType, lastAutoPrompt, stageCapabilities, TASK_SEQUENCE_VERSION } from './protocol'
import { fallbackStimulus, snapshotTaskStimulus } from './stimulusTask'
import type {
  Demographics,
  ExperimentalGroup,
  PlannedTask,
  Session,
  SessionRuntime,
  TaskRun,
} from './types'

export function emptyRuntime(): SessionRuntime {
  return {
    step: 'intro',
    task_index: 0,
    round: 0,
    draft_text: '',
    auto_prompt: '',
    auto_prompt_id: '',
    user_prompt_started: false,
    auto_prompt_view_started: false,
    auto_prompt_view_id: '',
    copied_from_auto: [],
    working_scene: null,
    baseline_scene: null,
    generate_error: '',
    selected_node_id: null,
    last_output_image_id: '',
    text_started: false,
    sketch_editing: false,
    result_viewing: false,
  }
}

function stimulusFor(planned: PlannedTask) {
  try {
    return snapshotTaskStimulus(getImage(planned.image_id), planned.stage)
  } catch {
    return fallbackStimulus(planned.stage)
  }
}

export function emptyTask(
  sessionId: string,
  participantId: string,
  planned: PlannedTask,
  group: ExperimentalGroup,
): TaskRun {
  const flags = stageCapabilities(planned.stage)
  const stimulus = stimulusFor(planned)
  return {
    participant_id: participantId,
    session_id: sessionId,
    task_id: planned.task_id,
    image_id: planned.image_id,
    category: stimulus.category,
    difficulty: stimulus.difficulty,
    primary_target: stimulus.primary_target,
    secondary_target: stimulus.secondary_target,
    target_modification_specification: stimulus.target_modification_specification,
    participant_instruction_version: stimulus.participant_instruction_version,
    participant_instruction: stimulus.participant_instruction,
    stage: planned.stage,
    block: planned.block,
    experimental_group: group,
    ai_enabled: flags.ai_enabled,
    sketch_enabled: flags.sketch_enabled,
    auto_prompt_enabled: flags.auto_prompt_enabled,
    round: 0,
    rounds: [],
    initial_text_version_id: '',
    final_text_version_id: '',
    initial_text: '',
    final_text: '',
    satisfied_round: null,
    started_at: '',
    ended_at: '',
    self_alignment_rating: null,
    self_alignment_timestamp: '',
    result_alignment_rating: null,
    result_alignment_timestamp: '',
    generation_count: 0,
    generation_success_count: 0,
    total_task_time_ms: null,
    text_edit_time_ms: null,
    generation_wait_time_ms: null,
    result_view_time_ms: null,
    sketch_edit_time_ms: null,
    auto_prompt_view_time_ms: null,
    total_sketch_actions: 0,
    copy_ratio: null,
    sketch_actions: [],
  }
}

export function createSessionBase(input: {
  participantId: string
  sessionId: string
  group: ExperimentalGroup
  pattern: Session['assignment_pattern']
  plan: PlannedTask[]
  demographics: Demographics
  shortSession: boolean
  startedAt: string
}): Session {
  return {
    participant_id: input.participantId,
    session_id: input.sessionId,
    assignment_pattern: input.pattern,
    experimental_group: input.group,
    condition_order: input.plan.map((item) => item.stage),
    task_sequence_version: TASK_SEQUENCE_VERSION,
    short_session: input.shortSession,
    demographics: input.demographics,
    tasks: input.plan.map((item) => emptyTask(input.sessionId, input.participantId, item, input.group)),
    event_log: [],
    text_versions: [],
    generations: [],
    sketch_snapshots: [],
    auto_prompts: [],
    subjective: null,
    started_at: input.startedAt,
    completed_at: null,
    session_status: 'in_progress',
    completion_status: 'incomplete',
    last_completed_task_id: null,
    current_task_id: input.plan[0]?.task_id ?? null,
    current_stage: input.plan[0]?.stage ?? null,
    current_round: 0,
    current_generation_id: null,
    current_text_version_id: null,
    current_sketch_snapshot_id: null,
    export_ready: false,
    validation: null,
    runtime: emptyRuntime(),
    seq: 0,
  }
}

export function syncSessionCursor(session: Session): Session {
  const completed = session.tasks.filter((item) => item.ended_at)
  const lastCompleted = completed[completed.length - 1] ?? null
  const active = session.tasks[session.runtime.task_index] ?? null
  const gens = session.generations.filter((item) => item.task_id === active?.task_id)
  const texts = session.text_versions.filter((item) => item.task_id === active?.task_id)
  const snaps = session.sketch_snapshots.filter((item) => item.task_id === active?.task_id)
  if (session.completed_at) session.session_status = 'completed'
  else if (session.session_status !== 'abandoned') {
    const resumed = session.event_log.some((item) => item.event_type === 'session_resume')
    session.session_status = resumed ? 'resumed' : 'in_progress'
  }
  session.completion_status = session.completed_at ? 'complete' : 'incomplete'
  session.last_completed_task_id = lastCompleted?.task_id ?? null
  session.current_task_id = active?.task_id ?? null
  session.current_stage = active?.stage ?? null
  session.current_round = session.runtime.round
  session.current_generation_id = gens[gens.length - 1]?.generation_id ?? null
  session.current_text_version_id = texts[texts.length - 1]?.text_version_id ?? null
  session.current_sketch_snapshot_id = snaps[snaps.length - 1]?.snapshot_id ?? null
  return session
}

export function stashTaskDraft(session: Session): void {
  const task = session.tasks[session.runtime.task_index]
  if (!task) return
  const draft = session.runtime.draft_text.trim()
  if (draft) task.final_text = draft
}

export function hydrateRuntimeForTask(session: Session, index: number): void {
  const task = session.tasks[index]
  if (!task) return
  session.runtime.task_index = index
  const texts = session.text_versions.filter(
    (item) => item.task_id === task.task_id && !isSystemTextType(item.text_type),
  )
  const lastUser = texts[texts.length - 1]
  const lastAuto = lastAutoPrompt(session, task.task_id)
  const lastOk = lastSuccessfulGeneration(session, task.task_id)
  const gens = session.generations.filter((item) => item.task_id === task.task_id)
  const lastGen = gens[gens.length - 1]
  const snaps = session.sketch_snapshots.filter((item) => item.task_id === task.task_id)
  const initial = snaps.find((item) => item.kind === 'initial') ?? snaps[0]
  const latest = snaps[snaps.length - 1]
  session.runtime.round = Math.max(task.round || 0, lastGen?.round || 0)
  session.runtime.draft_text = task.final_text || lastUser?.text || ''
  session.runtime.auto_prompt = lastAuto?.auto_prompt || ''
  session.runtime.auto_prompt_id = lastAuto?.auto_prompt_id || ''
  session.runtime.user_prompt_started = false
  session.runtime.auto_prompt_view_started = false
  session.runtime.auto_prompt_view_id = ''
  session.runtime.copied_from_auto = []
  session.runtime.working_scene = latest ? structuredClone(latest.scene) : null
  session.runtime.baseline_scene = initial ? structuredClone(initial.scene) : null
  session.runtime.generate_error = lastOk ? '' : lastGen?.error || ''
  session.runtime.selected_node_id = null
  session.runtime.last_output_image_id = lastOk?.output_image_id || lastOk?.generation_id || ''
  session.runtime.text_started = Boolean(session.runtime.draft_text)
  session.runtime.sketch_editing = false
  session.runtime.result_viewing = Boolean(lastOk)
  session.runtime.step = lastOk ? 'review' : 'describe'
}

export function summarizeTask(session: Session, task: TaskRun): TaskRun {
  const measures = measuresForTask(session, task)
  const initial = session.text_versions.find((item) => item.text_version_id === task.initial_text_version_id)
    ?? session.text_versions.find((item) => item.task_id === task.task_id && item.text_type === 'initial')
  const final = session.text_versions.find((item) => item.text_version_id === task.final_text_version_id)
    ?? [...session.text_versions].reverse().find((item) => item.task_id === task.task_id && item.text_type !== 'auto' && item.text_type !== 'auto_interpretation')
  const autos = session.auto_prompts.filter((item) => item.task_id === task.task_id)
  const copyValues = autos.map((item) => item.copy_ratio).filter((item): item is number => item != null)
  task.initial_text = initial?.text ?? task.initial_text
  task.final_text = final?.text ?? task.final_text
  task.generation_count = measures.generation_count
  task.generation_success_count = measures.generation_success_count
  task.total_task_time_ms = measures.task_time
  task.text_edit_time_ms = measures.text_active_edit_time
  task.generation_wait_time_ms = measures.generation_wait_time
  task.result_view_time_ms = measures.result_view_time
  task.sketch_edit_time_ms = measures.sketch_edit_time
  task.auto_prompt_view_time_ms = measures.auto_prompt_view_time
  task.total_sketch_actions = task.sketch_actions.length
  task.copy_ratio = copyValues.length ? copyValues[copyValues.length - 1] : measures.copy_ratio
  task.satisfied_round = measures.round_of_satisfaction
  return task
}
