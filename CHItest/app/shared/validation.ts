import { researcherSpecHiddenFromParticipants, specCoversPrimaryTargets } from './stimulusTask'
import { REQUIRED_EXPORT_FILES } from './exportManifest'
import { validateGenerationChain } from './generationChain'
import { isSystemTextType, t2ScaffoldLoopComplete } from './protocol'
import { STAGE_SEQUENCE, TASK_SEQUENCE_VERSION, type Session, type StudyValidationFlags, type TaskRun, type ValidationIssue, type ValidationResult } from './types'

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

function emptyFlags(overrides: Partial<StudyValidationFlags> = {}): StudyValidationFlags {
  return {
    sequence_correct: true,
    group_assignment_correct: true,
    stimulus_target_alignment: true,
    generation_input_chain_correct: true,
    t0_valid: true,
    t1_valid: true,
    t2_scaffold_loop_valid: true,
    auto_prompt_cycle_valid: true,
    sketch_api_separation_valid: true,
    t3_scaffold_removed: true,
    session_recovery_valid: true,
    timing_complete: true,
    required_exports_present: true,
    ...overrides,
  }
}

export function validateTask(session: Session, task: TaskRun): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const id = task.task_id
  const start = eventsOf(session, id, 'task_start')
  const end = eventsOf(session, id, 'task_end')
  if (!start.length) issues.push(issue('task_start_missing', 'task_start is missing', id))
  if (task.ended_at && !end.length) issues.push(issue('task_end_missing', 'task_end is missing', id))
  if (end.length > 1) issues.push(issue('task_end_duplicate', 'task_end must occur only once', id))
  if (start.length > 1) issues.push(issue('task_start_duplicate', 'task_start must occur only once', id))

  const initial = session.text_versions.find((item) => item.text_version_id === task.initial_text_version_id)
    ?? session.text_versions.find((item) => item.task_id === id && item.text_type === 'initial')
  const final = session.text_versions.find((item) => item.text_version_id === task.final_text_version_id)
    ?? session.text_versions.find((item) => item.task_id === id && (item.text_type === 'final' || item.text_type === 'refined' || item.text_type === 'user_revised'))
  if (task.ended_at && !initial?.text && !task.initial_text) issues.push(issue('initial_text_missing', 'initial_text is missing', id))
  if (task.ended_at && !final?.text && !task.final_text) issues.push(issue('final_text_missing', 'final_text is missing', id))

  if (task.stage === 'T0') {
    if (task.ai_enabled || task.sketch_enabled || task.auto_prompt_enabled) {
      issues.push(issue('t0_flags', 'T0 must keep ai/sketch/auto_prompt disabled', id))
    }
    if (session.generations.some((item) => item.task_id === id)) {
      issues.push(issue('t0_generation', 'T0 must not have generation records', id))
    }
    if (task.primary_target != null || task.secondary_target != null || task.target_modification_specification != null) {
      issues.push(issue('t0_targets', 'T0 target fields must be null', id))
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
  for (const chainIssue of validateGenerationChain(session, task)) {
    issues.push(issue('generation_input_chain', chainIssue, id))
  }

  if (task.stage === 'T2' && task.ended_at) {
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
    if (!t2ScaffoldLoopComplete(session, task)) {
      issues.push(issue('t2_scaffold_loop', 'T2 must complete Sketch → Auto Prompt → user revision → generation on the current image', id))
    }
    const interprets = eventsOf(session, id, 'interpret_sketch_click')
    if (autos.length !== interprets.length) {
      issues.push(issue('auto_prompt_cycle', 'Auto Prompt count must equal Interpret Sketch clicks', id))
    }
  }

  const satisfied = eventsOf(session, id, 'satisfied_click')
  if (task.stage !== 'T0' && task.ended_at && satisfied.length && task.satisfied_round == null) {
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

function flagFromIssues(issues: ValidationIssue[], prefixes: string[]): boolean {
  return !issues.some((item) => prefixes.some((prefix) => item.code === prefix || item.code.startsWith(prefix)))
}

export function studyFlags(session: Session, issues: ValidationIssue[]): StudyValidationFlags {
  const t0 = session.tasks.filter((item) => item.stage === 'T0')
  const t1 = session.tasks.filter((item) => item.stage === 'T1')
  const t2 = session.tasks.filter((item) => item.stage === 'T2')
  const t3 = session.tasks.filter((item) => item.stage === 'T3')
  const expected = STAGE_SEQUENCE[session.experimental_group]
  const sequenceCorrect =
    session.task_sequence_version === TASK_SEQUENCE_VERSION &&
    (session.short_session ||
      (session.tasks.length === 7 &&
        expected &&
        session.condition_order.join(',') === expected.join(',') &&
        session.tasks.map((item) => item.stage).join(',') === expected.join(',')))
  const groupCorrect = Boolean(session.experimental_group) && Boolean(session.assignment_pattern) && Boolean(session.condition_order?.length)
  const stimulusOk = session.tasks.every((task) => {
    if (task.stage === 'T0') {
      return task.primary_target == null && task.secondary_target == null && task.target_modification_specification == null
    }
    const spec = task.target_modification_specification
    const instruction = `${task.participant_instruction?.zh ?? ''}\n${task.participant_instruction?.en ?? ''}`
    return (
      Boolean(task.image_id) &&
      Boolean(task.category) &&
      Boolean(task.difficulty) &&
      specCoversPrimaryTargets(spec, task.primary_target) &&
      researcherSpecHiddenFromParticipants(instruction)
    )
  })
  const t0ok = t0.every(
    (task) =>
      !task.ai_enabled &&
      !task.sketch_enabled &&
      !task.auto_prompt_enabled &&
      !session.generations.some((item) => item.task_id === task.task_id) &&
      task.target_modification_specification == null,
  )
  const t1ok = t1.every(
    (task) =>
      task.ai_enabled &&
      !task.sketch_enabled &&
      !task.auto_prompt_enabled &&
      (!task.ended_at || session.generations.some((item) => item.task_id === task.task_id)),
  )
  const t2ok =
    session.experimental_group === 'control'
      ? t2.length === 0
      : t2.every((task) => !task.ended_at || t2ScaffoldLoopComplete(session, task))
  const autoCycle = t2.every((task) => {
    if (!task.ended_at) return true
    const autos = session.auto_prompts.filter((item) => item.task_id === task.task_id)
    const interprets = eventsOf(session, task.task_id, 'interpret_sketch_click')
    return autos.length === interprets.length && autos.length > 0
  })
  const sketchSep = session.generations.every(
    (item) => item.sketch_sent === false && item.api_input === 'image+text' && !item.input_sketch_snapshot_id,
  )
  const t3ok = t3.every(
    (task) =>
      !task.sketch_enabled &&
      !task.auto_prompt_enabled &&
      task.sketch_actions.length === 0 &&
      !session.auto_prompts.some((item) => item.task_id === task.task_id),
  )
  const eventIds = session.event_log.map((item) => item.event_id)
  const uniqueEvents = new Set(eventIds).size === eventIds.length
  const genIds = session.generations.map((item) => item.generation_id)
  const uniqueGens = new Set(genIds).size === genIds.length
  const noFakeEnd = session.tasks.every((task) => {
    if (!task.ended_at) return eventsOf(session, task.task_id, 'task_end').length === 0
    return eventsOf(session, task.task_id, 'task_end').length === 1
  })
  const recovery =
    uniqueEvents &&
    uniqueGens &&
    noFakeEnd &&
    Boolean(session.session_id) &&
    (session.session_status === 'abandoned' ||
      session.session_status === 'completed' ||
      session.session_status === 'in_progress' ||
      session.session_status === 'resumed')
  const completed = Boolean(session.completed_at)
  const timing =
    session.event_log.some((item) => item.event_type === 'session_start') &&
    (!completed || session.event_log.some((item) => item.event_type === 'session_end')) &&
    session.tasks
      .filter((item) => item.ended_at)
      .every((task) => {
        const start = eventsOf(session, task.task_id, 'task_start').length
        const end = eventsOf(session, task.task_id, 'task_end').length
        if (start !== 1 || end !== 1) return false
        if (task.stage === 'T0') return true
        return (
          paired(eventsOf(session, task.task_id, 'generation_start').length, eventsOf(session, task.task_id, 'generation_end').length) &&
          eventsOf(session, task.task_id, 'text_input_start').length > 0 &&
          eventsOf(session, task.task_id, 'satisfied_click').length > 0
        )
      })
  return emptyFlags({
    sequence_correct: sequenceCorrect,
    group_assignment_correct: groupCorrect,
    stimulus_target_alignment: stimulusOk,
    generation_input_chain_correct: flagFromIssues(issues, ['generation_input_chain']),
    t0_valid: t0ok,
    t1_valid: t1ok,
    t2_scaffold_loop_valid: t2ok,
    auto_prompt_cycle_valid: autoCycle,
    sketch_api_separation_valid: sketchSep,
    t3_scaffold_removed: t3ok,
    session_recovery_valid: recovery,
    timing_complete: timing,
    required_exports_present: REQUIRED_EXPORT_FILES.length === 12,
  })
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
    if (task.ended_at || task.started_at) issues.push(...validateTask(session, task))
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
  const flags = studyFlags(session, issues)
  if (!flags.sequence_correct) issues.push(issue('sequence_correct', 'task sequence does not match the locked protocol'))
  if (!flags.group_assignment_correct) issues.push(issue('group_assignment_correct', 'group assignment metadata is incomplete'))
  if (!flags.stimulus_target_alignment) issues.push(issue('stimulus_target_alignment', 'task stimulus and participant instruction are not aligned'))
  if (!flags.generation_input_chain_correct) issues.push(issue('generation_input_chain_correct', 'generation current-image chain is invalid'))
  if (!flags.t0_valid) issues.push(issue('t0_valid', 'T0 is not a description-only baseline'))
  if (!flags.t1_valid) issues.push(issue('t1_valid', 'T1 must be text-only generation'))
  if (!flags.t2_scaffold_loop_valid) issues.push(issue('t2_scaffold_loop_valid', 'T2 scaffold loop is incomplete'))
  if (!flags.auto_prompt_cycle_valid) issues.push(issue('auto_prompt_cycle_valid', 'Auto Prompt was not tied to Interpret Sketch'))
  if (!flags.sketch_api_separation_valid) issues.push(issue('sketch_api_separation_valid', 'Sketch must not enter the final generation API'))
  if (!flags.t3_scaffold_removed) issues.push(issue('t3_scaffold_removed', 'T3 must have no Sketch or Auto Prompt'))
  if (!flags.session_recovery_valid) issues.push(issue('session_recovery_valid', 'session recovery log is not append-only / unique'))
  if (session.completed_at && !flags.timing_complete) issues.push(issue('timing_complete', 'required timing events are not closed'))
  if (!flags.required_exports_present) issues.push(issue('required_exports_present', 'required export files are missing from the manifest'))
  const completion_status = session.completed_at && session.session_status !== 'abandoned' ? 'complete' : 'incomplete'
  const flagsOk = Object.values(flags).every(Boolean)
  const export_ready = flagsOk && completion_status === 'complete' && issues.length === 0
  return {
    ok: issues.length === 0 && flagsOk,
    export_ready,
    completion_status,
    flags,
    issues,
    validation_issues: issues,
  }
}

export function markExportReadiness(session: Session): ValidationResult {
  const validation = validateSession(session)
  session.validation = validation
  session.completion_status = validation.completion_status
  session.export_ready = validation.export_ready
  return validation
}

export { isSystemTextType }
