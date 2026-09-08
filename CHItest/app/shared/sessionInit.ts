import { measuresForTask } from './behavior'
import { stageCapabilities, TASK_SEQUENCE_VERSION } from './protocol'
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

export function emptyTask(
  sessionId: string,
  participantId: string,
  planned: PlannedTask,
  group: ExperimentalGroup,
): TaskRun {
  const flags = stageCapabilities(planned.stage)
  return {
    participant_id: participantId,
    session_id: sessionId,
    task_id: planned.task_id,
    image_id: planned.image_id,
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
    export_ready: false,
    validation: null,
    runtime: emptyRuntime(),
    seq: 0,
  }
}

export function summarizeTask(session: Session, task: TaskRun): TaskRun {
  const measures = measuresForTask(session, task)
  const initial = session.text_versions.find((item) => item.text_version_id === task.initial_text_version_id)
    ?? session.text_versions.find((item) => item.task_id === task.task_id && item.text_type === 'initial')
  const final = session.text_versions.find((item) => item.text_version_id === task.final_text_version_id)
    ?? [...session.text_versions].reverse().find((item) => item.task_id === task.task_id && item.text_type !== 'auto')
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
