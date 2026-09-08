import { STAGE_SEQUENCE, TASK_SEQUENCE_VERSION } from './types'
import type { Session, TaskRun, ValidationIssue, ValidationResult } from './types'

function issue(code: string, message: string, taskId?: string): ValidationIssue {
  return { code, message, task_id: taskId }
}

function parseableScene(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const scene = value as { camera?: unknown; subjects?: unknown; objects?: unknown }
  return Boolean(scene.camera) && Array.isArray(scene.subjects) && Array.isArray(scene.objects)
}

function eventsOf(session: Session, taskId: string, type: string) {
  return session.event_log.filter((item) => item.task_id === taskId && item.event_type === type)
}

function paired(starts: number, ends: number): boolean {
  return starts > 0 && starts === ends
}

export function validateTask(session: Session, task: TaskRun): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const id = task.task_id
  const start = eventsOf(session, id, 'task_start')
  const end = eventsOf(session, id, 'task_end')
  if (!start.length) issues.push(issue('task_start_missing', 'task_start is missing', id))
  if (!end.length) issues.push(issue('task_end_missing', 'task_end is missing', id))

  const initial = session.text_versions.find((item) => item.text_version_id === task.initial_text_version_id)
    ?? session.text_versions.find((item) => item.task_id === id && item.text_type === 'initial')
  const final = session.text_versions.find((item) => item.text_version_id === task.final_text_version_id)
    ?? session.text_versions.find((item) => item.task_id === id && (item.text_type === 'final' || item.text_type === 'refined'))
  if (!initial?.text && !task.initial_text) issues.push(issue('initial_text_missing', 'initial_text is missing', id))
  if (!final?.text && !task.final_text) issues.push(issue('final_text_missing', 'final_text is missing', id))

  if (task.stage === 'T0') {
    if (task.ai_enabled || task.sketch_enabled || task.auto_prompt_enabled) {
      issues.push(issue('t0_flags', 'T0 must keep ai/sketch/auto_prompt disabled', id))
    }
    if (session.generations.some((item) => item.task_id === id)) {
      issues.push(issue('t0_generation', 'T0 must not have generation records', id))
    }
  }

  const gens = session.generations.filter((item) => item.task_id === id)
  for (const gen of gens) {
    if (!gen.timestamp_start || !gen.timestamp_end) {
      issues.push(issue('generation_timestamps', `${gen.generation_id} is missing start/end`, id))
    }
    if (!gen.input_text) issues.push(issue('generation_input_text', `${gen.generation_id} is missing input_text`, id))
    if (gen.sketch_sent !== false) issues.push(issue('sketch_sent', `${gen.generation_id} sketch_sent must be false`, id))
    if (gen.api_input !== 'image+text') issues.push(issue('api_input', `${gen.generation_id} api_input must be image+text`, id))
    if (gen.input_sketch_snapshot_id) {
      issues.push(issue('input_sketch', `${gen.generation_id} input_sketch_snapshot_id must be empty`, id))
    }
    const expectedLatency = Math.max(0, Date.parse(gen.timestamp_end) - Date.parse(gen.timestamp_start))
    if (Number.isFinite(expectedLatency) && Math.abs(expectedLatency - gen.latency_ms) > 5) {
      issues.push(issue('generation_latency', `${gen.generation_id} latency does not match timestamps`, id))
    }
    const payloadPrompt = typeof gen.api_payload?.prompt === 'string' ? gen.api_payload.prompt : ''
    if (payloadPrompt && payloadPrompt !== gen.input_text) {
      issues.push(issue('api_text_mismatch', `${gen.generation_id} API payload prompt does not match input_text`, id))
    }
    if (gen.api_payload && gen.api_payload.sketch_sent !== false) {
      issues.push(issue('api_payload_sketch', `${gen.generation_id} API payload must record sketch_sent=false`, id))
    }
  }

  if (task.stage === 'T2') {
    const autos = session.auto_prompts.filter((item) => item.task_id === id)
    for (const auto of autos) {
      if (!auto.source_sketch_snapshot_id) {
        issues.push(issue('auto_snapshot', `${auto.auto_prompt_id} is missing source_sketch_snapshot_id`, id))
      }
      if (!auto.auto_prompt) issues.push(issue('auto_text', `${auto.auto_prompt_id} is missing auto_prompt`, id))
    }
    const viewsStart = eventsOf(session, id, 'auto_prompt_view_start')
    const viewsEnd = eventsOf(session, id, 'auto_prompt_view_end')
    if (autos.length && !paired(viewsStart.length, viewsEnd.length)) {
      issues.push(issue('auto_view_pair', 'auto_prompt_view_start/end are not paired', id))
    }
    const snapshots = session.sketch_snapshots.filter((item) => item.task_id === id)
    for (const snap of snapshots) {
      if (!parseableScene(snap.scene)) issues.push(issue('snapshot_scene', `${snap.snapshot_id} scene is not parseable`, id))
    }
    for (const kind of ['initial', 'pre_auto_prompt', 'post_user_revision'] as const) {
      if (!snapshots.some((item) => item.kind === kind && parseableScene(item.scene))) {
        issues.push(issue('t2_snapshot_kind', `T2 is missing a parseable ${kind} snapshot`, id))
      }
    }
  }

  const satisfied = eventsOf(session, id, 'satisfied_click')
  if (task.stage !== 'T0' && satisfied.length && task.satisfied_round == null) {
    issues.push(issue('satisfaction_round', 'satisfied_click exists but round_of_satisfaction is null', id))
  }

  if (task.started_at && task.ended_at) {
    const elapsed = Date.parse(task.ended_at) - Date.parse(task.started_at)
    if (elapsed < 0) issues.push(issue('task_time_negative', 'task_time is negative', id))
  }
  if (task.total_task_time_ms != null && task.total_task_time_ms < 0) {
    issues.push(issue('task_time_negative', 'task_time is negative', id))
  }

  return issues
}

export function validateSession(session: Session): ValidationResult {
  const issues: ValidationIssue[] = []
  if (session.task_sequence_version !== TASK_SEQUENCE_VERSION) {
    issues.push(issue('sequence_version', `task_sequence_version must be ${TASK_SEQUENCE_VERSION}`))
  }
  if (!session.experimental_group) {
    issues.push(issue('experimental_group', 'experimental_group is missing'))
  }
  if (!session.assignment_pattern) {
    issues.push(issue('assignment_pattern', 'assignment_pattern is missing'))
  }
  if (!session.condition_order?.length) {
    issues.push(issue('condition_order', 'condition_order is missing'))
  }
  if (!session.short_session) {
    const expected = STAGE_SEQUENCE[session.experimental_group]
    if (session.tasks.length !== 7) issues.push(issue('task_count', 'formal session must have 7 tasks'))
    if (expected && session.condition_order.join(',') !== expected.join(',')) {
      issues.push(issue('condition_order_mismatch', 'condition_order does not match experimental_group'))
    }
    if (expected && session.tasks.map((item) => item.stage).join(',') !== expected.join(',')) {
      issues.push(issue('task_sequence', 'executed task stages do not match experimental_group'))
    }
  }
  for (const task of session.tasks) {
    if (task.ended_at) issues.push(...validateTask(session, task))
  }
  const timeline = session.event_log
  if (!timeline.some((item) => item.event_type === 'session_start')) {
    issues.push(issue('session_start', 'session_start is missing'))
  }
  const reconstructable = timeline.every(
    (item) =>
      Boolean(item.event_id) &&
      Boolean(item.timestamp) &&
      Boolean(item.event_type) &&
      Number.isFinite(item.relative_time_ms),
  )
  if (timeline.length > 0 && !reconstructable) {
    issues.push(issue('timeline_rebuild', 'event_log cannot independently rebuild the session timeline'))
  }
  return { ok: issues.length === 0, issues }
}

export function markExportReadiness(session: Session): ValidationResult {
  const validation = validateSession(session)
  session.validation = validation
  session.export_ready = validation.ok && Boolean(session.completed_at)
  return validation
}
