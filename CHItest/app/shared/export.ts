import { groupCode, groupSequence } from './assign'
import { experiment, getImage } from './config'
import { getGeneratedImages } from './imageStore'
import { measuresForSession, measuresForTask } from './behavior'
import {
  aiFeedbackGain,
  mean,
  practiceControlContrast,
  precisionNorm,
  sketchGain,
  transferContrast,
  transferGain,
  withinTaskDelta,
} from './metrics'
import { loadStore } from './store'
import { REQUIRED_EXPORT_FILES } from './exportManifest'
import { markExportReadiness } from './validation'
import type { ExperimentalGroup, IntentCoding, Session, Stage, TaskBlock, TaskRun, Timepoint } from './types'
import { zipStore } from './zip'

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(',')),
  ].join('\n')
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function download(filename: string, content: string, type: string): void {
  downloadBlob(filename, new Blob([content], { type }))
}

function textAt(session: Session, task: TaskRun, timepoint: Timepoint): string {
  const versions = session.text_versions.filter((item) => item.task_id === task.task_id)
  if (timepoint === 'initial') {
    return versions.find((item) => item.text_version_id === task.initial_text_version_id)?.text
      || versions.find((item) => item.text_type === 'initial')?.text
      || versions[0]?.text
      || ''
  }
  return versions.find((item) => item.text_version_id === task.final_text_version_id)?.text
    || [...versions].reverse()[0]?.text
    || ''
}

function codingFor(codings: IntentCoding[], trialId: string, timepoint: Timepoint, stage?: Stage) {
  return codings.find(
    (item) => item.trial_id === trialId && item.timepoint === timepoint && (!stage || item.stage === stage),
  )
}

function imageActiveCount(imageId: string): number {
  try {
    const image = getImage(imageId)
    return image.target_dimensions.length || 6
  } catch {
    return 6
  }
}

function codingNorm(coding: IntentCoding | undefined, imageId: string): number | null {
  if (coding?.precision_norm != null) return coding.precision_norm
  return precisionNorm(coding?.precision_total ?? null, imageActiveCount(imageId))
}

function meanBlock(sessions: Session[], group: ExperimentalGroup, block: TaskBlock, codings: IntentCoding[]): number | null {
  return mean(
    sessions
      .filter((session) => session.experimental_group === group)
      .flatMap((session) =>
        session.tasks
          .filter((task) => task.block === block)
          .map((task) => codingNorm(codingFor(codings, task.task_id, 'final'), task.image_id)),
      ),
  )
}

function meanStage(session: Session, codings: IntentCoding[], stage: Stage, timepoint: Timepoint): number | null {
  const totals = session.tasks
    .filter((task) => task.stage === stage)
    .map((task) => codingFor(codings, task.task_id, timepoint, stage)?.precision_total ?? null)
  return mean(totals)
}

export function participantRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.map((session) => ({
    participant_id: session.participant_id,
    session_id: session.session_id,
    assignment_pattern: session.assignment_pattern,
    group: groupCode(session.experimental_group),
    group_sequence: groupSequence(session.experimental_group),
    experimental_group: session.experimental_group,
    condition_order: session.condition_order?.join('>') ?? '',
    task_sequence_version: session.task_sequence_version ?? '',
    short_session: session.short_session ? 1 : 0,
    export_ready: session.export_ready ? 1 : 0,
    completion_status: session.completion_status ?? (session.completed_at ? 'complete' : 'incomplete'),
    session_status: session.session_status ?? '',
    last_completed_task_id: session.last_completed_task_id ?? '',
    current_task_id: session.current_task_id ?? '',
    background: session.demographics.visual_experience,
    AI_familiarity: session.demographics.ai_familiarity,
    cinematography_experience: session.demographics.cinematography_experience,
    visual_experience: session.demographics.visual_experience,
    cinematography_years: session.demographics.cinematography_years,
    started_at: session.started_at,
    completed_at: session.completed_at ?? '',
    ...measuresForSession(session),
  }))
}

export function taskRows(sessions: Session[], codings: IntentCoding[]): Record<string, unknown>[] {
  return sessions.flatMap((session) =>
    session.tasks.map((task) => {
      const image = getImage(task.image_id)
      const pInitial = codingFor(codings, task.task_id, 'initial')?.precision_total ?? null
      const pFinal = codingFor(codings, task.task_id, 'final')?.precision_total ?? null
      const measures = measuresForTask(session, task)
      return {
        participant_id: session.participant_id,
        session_id: session.session_id,
        task_id: task.task_id,
        stage: task.stage,
        block: task.block,
        group_code: groupCode(task.experimental_group ?? session.experimental_group),
        experimental_group: task.experimental_group ?? session.experimental_group,
        image_id: task.image_id,
        category: task.category || image.group,
        group: image.group,
        difficulty: task.difficulty || image.difficulty,
        primary_target: (task.primary_target ?? []).join('|'),
        secondary_target: (task.secondary_target ?? []).join('|'),
        target_modification_specification:
          task.target_modification_specification == null
            ? ''
            : JSON.stringify(task.target_modification_specification),
        participant_instruction_version: task.participant_instruction_version ?? '',
        participant_instruction: task.participant_instruction?.zh ?? '',
        ai_enabled: task.ai_enabled ? 1 : 0,
        sketch_enabled: task.sketch_enabled ? 1 : 0,
        auto_prompt_enabled: task.auto_prompt_enabled ? 1 : 0,
        ...measures,
        number_of_rounds: measures.number_of_rounds,
        round_count: task.rounds.length,
        satisfied_round: measures.round_of_satisfaction ?? '',
        initial_text_version_id: task.initial_text_version_id,
        final_text_version_id: task.final_text_version_id,
        initial_text: task.initial_text,
        final_text: task.final_text,
        total_task_time_ms: task.total_task_time_ms ?? measures.task_time ?? '',
        text_edit_time_ms: task.text_edit_time_ms ?? measures.text_active_edit_time ?? '',
        generation_wait_time_ms: task.generation_wait_time_ms ?? measures.generation_wait_time ?? '',
        result_view_time_ms: task.result_view_time_ms ?? measures.result_view_time ?? '',
        sketch_edit_time_ms: task.sketch_edit_time_ms ?? measures.sketch_edit_time ?? '',
        auto_prompt_view_time_ms: task.auto_prompt_view_time_ms ?? measures.auto_prompt_view_time ?? '',
        self_alignment_rating: task.self_alignment_rating ?? '',
        result_alignment_rating: task.result_alignment_rating ?? '',
        started_at: task.started_at,
        ended_at: task.ended_at,
        P_initial: pInitial ?? '',
        P_final: pFinal ?? '',
        P_norm: codingNorm(codingFor(codings, task.task_id, 'final'), task.image_id) ?? '',
        delta_P: withinTaskDelta(pFinal, pInitial) ?? '',
      }
    }),
  )
}

export function eventLogRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.flatMap((session) =>
    session.event_log.map((event) => ({
      event_id: event.event_id,
      participant_id: event.participant_id,
      session_id: event.session_id,
      task_id: event.task_id,
      stage: event.stage,
      round: event.round ?? '',
      event_type: event.event_type,
      timestamp: event.timestamp,
      relative_time_ms: event.relative_time_ms,
      payload: JSON.stringify(event.payload),
    })),
  )
}

export function intentRows(sessions: Session[], codings: IntentCoding[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (const session of sessions) {
    for (const version of session.text_versions) {
      const task = session.tasks.find((item) => item.task_id === version.task_id)
      const coding = codings.find(
        (item) =>
          item.trial_id === version.task_id &&
          item.timepoint === (version.text_type === 'initial' ? 'initial' : version.text_type === 'auto' ? 'auto' : 'final') &&
          item.coder_id,
      )
      rows.push({
        text_version_id: version.text_version_id,
        participant_id: version.participant_id,
        session_id: version.session_id,
        task_id: version.task_id,
        stage: version.stage,
        round: version.round,
        timestamp: version.timestamp,
        text_type: version.text_type,
        previous_text_version_id: version.previous_text_version_id,
        text_length: version.text_length,
        text: version.text,
        precision_object: coding?.precision.object ?? '',
        precision_spatial: coding?.precision.spatial ?? '',
        precision_relation: coding?.precision.relation ?? '',
        precision_camera: coding?.precision.camera ?? '',
        precision_emotion: coding?.precision.emotion ?? '',
        precision_constraint: coding?.precision.constraint ?? '',
        precision_total: coding?.precision_total ?? '',
        precision_norm: coding?.precision_norm ?? (task ? codingNorm(coding, task.image_id) : '') ?? '',
      })
    }
    const p0 = meanStage(session, codings, 'T0', 'final')
    const p1 = meanStage(session, codings, 'T1', 'final')
    const p2 = meanStage(session, codings, 'T2', 'final')
    const p3 = meanStage(session, codings, 'T3', 'final')
    rows.push({
      text_version_id: '',
      participant_id: session.participant_id,
      session_id: session.session_id,
      task_id: '',
      stage: 'summary',
      round: '',
      timestamp: '',
      text_type: 'summary',
      previous_text_version_id: '',
      text_length: '',
      text: '',
      precision_object: '',
      precision_spatial: '',
      precision_relation: '',
      precision_camera: '',
      precision_emotion: '',
      precision_constraint: '',
      precision_total: '',
      P0: p0 ?? '',
      P1: p1 ?? '',
      P2: p2 ?? '',
      P3: p3 ?? '',
      G_AI: aiFeedbackGain(p1, p0) ?? '',
      G_Sketch: sketchGain(p2, p1) ?? '',
      G_Transfer: transferGain(p3, p1) ?? '',
    })
  }
  return rows
}

export function generationRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.flatMap((session) =>
    session.generations.map((item) => ({
      generation_id: item.generation_id,
      participant_id: item.participant_id,
      session_id: item.session_id,
      task_id: item.task_id,
      stage: item.stage,
      round: item.round,
      timestamp_start: item.timestamp_start,
      timestamp_end: item.timestamp_end,
      latency_ms: item.latency_ms,
      model: item.model,
      model_version: item.model_version,
      input_image_id: item.input_image_id,
      previous_generation_id: item.previous_generation_id ?? '',
      generation_input_chain_valid: item.generation_input_chain_valid ? 1 : 0,
      input_text: item.input_text,
      input_text_version_id: item.input_text_version_id,
      input_sketch_snapshot_id: item.input_sketch_snapshot_id,
      source_sketch_snapshot_id: item.source_sketch_snapshot_id,
      auto_prompt_id: item.auto_prompt_id ?? '',
      user_prompt_version_id: item.user_prompt_version_id ?? '',
      sketch_sent: item.sketch_sent,
      api_input: item.api_input,
      api_payload: JSON.stringify(item.api_payload ?? {}),
      output_image_id: item.output_image_id,
      success: item.success,
      error: item.error,
    })),
  )
}

export function autoPromptRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.flatMap((session) =>
    (session.auto_prompts ?? []).map((item) => ({
      auto_prompt_id: item.auto_prompt_id,
      participant_id: item.participant_id,
      session_id: item.session_id,
      task_id: item.task_id,
      round: item.round,
      timestamp: item.timestamp_generated,
      timestamp_generated: item.timestamp_generated,
      source_sketch_snapshot_id: item.source_sketch_snapshot_id,
      auto_prompt: item.auto_prompt,
      auto_prompt_length: item.auto_prompt_length,
      user_prompt_before: item.user_prompt_before,
      user_prompt_after: item.user_prompt_after,
      user_prompt_version_id: item.user_prompt_version_id,
      p_auto: item.auto_prompt,
      p_user: item.user_prompt_after,
      edit_distance: item.edit_distance ?? '',
      text_similarity: item.text_similarity ?? '',
      copy_ratio: item.copy_ratio ?? '',
      copied_segments: JSON.stringify(item.copied_segments ?? []),
    })),
  )
}

export function textVersionRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.flatMap((session) =>
    session.text_versions.map((item) => ({
      text_version_id: item.text_version_id,
      participant_id: item.participant_id,
      session_id: item.session_id,
      task_id: item.task_id,
      stage: item.stage,
      round: item.round,
      timestamp: item.timestamp,
      text: item.text,
      text_type: item.text_type,
      previous_text_version_id: item.previous_text_version_id,
      source: item.source,
      text_length: item.text_length,
    })),
  )
}

export function selfAlignmentRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.flatMap((session) =>
    session.tasks
      .filter((task) => task.stage !== 'T0')
      .map((task) => ({
        participant_id: session.participant_id,
        session_id: session.session_id,
        task_id: task.task_id,
        stage: task.stage,
        round: task.satisfied_round ?? task.round,
        timestamp: task.self_alignment_timestamp,
        self_alignment_rating: task.self_alignment_rating ?? '',
        self_alignment_timestamp: task.self_alignment_timestamp,
        result_alignment_rating: task.result_alignment_rating ?? '',
        result_alignment_timestamp: task.result_alignment_timestamp,
      })),
  )
}

export function interactionRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.flatMap((session) =>
    session.tasks.flatMap((task) =>
      task.sketch_actions.map((action) => ({
        sketch_event_id: action.sketch_event_id,
        participant_id: action.participant_id,
        session_id: action.session_id,
        task_id: action.task_id,
        round: action.round,
        timestamp: action.timestamp,
        associated_generation_round: action.associated_generation_round,
        action_type: action.action_type,
        target_id: action.target_id,
        before_state: JSON.stringify(action.before_state ?? null),
        after_state: JSON.stringify(action.after_state ?? null),
      })),
    ),
  )
}

function ratingPrecision(rating: ReturnType<typeof loadStore>['ratings'][number]) {
  return (
    rating.precision ?? {
      object: null,
      spatial: null,
      relation: null,
      camera: null,
      emotion: null,
      constraint: null,
    }
  )
}

export function expertRows(ratings: ReturnType<typeof loadStore>['ratings']): Record<string, unknown>[] {
  return ratings.map((rating) => {
    const precision = ratingPrecision(rating)
    return {
      participant_id: rating.participant_id,
      task_id: rating.task_id,
      expert_id: rating.expert_id,
      timepoint: 'final',
      object: precision.object ?? '',
      spatial: precision.spatial ?? '',
      relation: precision.relation ?? '',
      camera: precision.camera ?? '',
      emotion: precision.emotion ?? '',
      constraint: precision.constraint ?? '',
      interpretability: rating.interpretability ?? rating.final?.intent_interpretability ?? '',
      specificity: rating.specificity ?? rating.final?.spatial_specificity ?? '',
      executability: rating.executability ?? rating.final?.executability ?? '',
      comment: rating.comment ?? '',
    }
  })
}

export function expertDimensionRows(ratings: ReturnType<typeof loadStore>['ratings']): Record<string, unknown>[] {
  return ratings.flatMap((rating) => {
    const precision = ratingPrecision(rating)
    return (Object.entries(precision) as [string, number | null][])
      .filter(([, score]) => score != null)
      .map(([dimension, score]) => ({
        participant_id: rating.participant_id,
        task_id: rating.task_id,
        expert_id: rating.expert_id,
        dimension,
        score,
      }))
  })
}

export function snapshotPayload(sessions: Session[]) {
  return sessions.flatMap((session) =>
    session.sketch_snapshots.map((item) => ({
      snapshot_id: item.snapshot_id,
      participant_id: item.participant_id,
      session_id: item.session_id,
      task_id: item.task_id,
      stage: item.stage,
      round: item.round,
      kind: item.kind,
      timestamp: item.timestamp,
      svg: item.svg,
      scene: item.scene,
    })),
  )
}

export function practiceControlAnalysis(sessions: Session[], codings: IntentCoding[]) {
  const scaffoldEarly = meanBlock(sessions, 'scaffold', 'early', codings)
  const scaffoldMiddle = meanBlock(sessions, 'scaffold', 'middle', codings)
  const controlEarly = meanBlock(sessions, 'control', 'early', codings)
  const controlMiddle = meanBlock(sessions, 'control', 'middle', codings)
  const scaffoldT3 = meanBlock(sessions, 'scaffold', 'transfer', codings)
  const controlT3 = meanBlock(sessions, 'control', 'transfer', codings)
  const scaffoldDelta =
    scaffoldMiddle != null && scaffoldEarly != null ? scaffoldMiddle - scaffoldEarly : null
  const controlDelta = controlMiddle != null && controlEarly != null ? controlMiddle - controlEarly : null
  return {
    scaffold_early: scaffoldEarly,
    scaffold_middle: scaffoldMiddle,
    control_early: controlEarly,
    control_middle: controlMiddle,
    scaffold_middle_minus_early: scaffoldDelta,
    control_middle_minus_early: controlDelta,
    primary_scaffold_test: practiceControlContrast(scaffoldDelta, controlDelta),
    scaffold_t3: scaffoldT3,
    control_t3: controlT3,
    transfer_scaffold_minus_control: transferContrast(scaffoldT3, controlT3),
    note: 'Do not claim T2 improvement from T2 > T1 alone. T3 is same-session near-term transfer.',
  }
}

export function timelinePayload(session: Session) {
  return {
    participant_id: session.participant_id,
    session_id: session.session_id,
    session_start: session.started_at,
    session_end: session.completed_at,
    completion_status: session.completion_status ?? (session.completed_at ? 'complete' : 'incomplete'),
    session_status: session.session_status,
    assignment_pattern: session.assignment_pattern,
    group: groupCode(session.experimental_group),
    group_sequence: groupSequence(session.experimental_group),
    experimental_group: session.experimental_group,
    condition_order: session.condition_order,
    task_sequence_version: session.task_sequence_version,
    short_session: session.short_session,
    events: session.event_log.map((event) => ({
      timestamp: event.timestamp,
      relative_time_ms: event.relative_time_ms,
      task_id: event.task_id,
      stage: event.stage,
      round: event.round,
      event_type: event.event_type,
      payload: event.payload,
    })),
  }
}

export function validationPayload(session: Session) {
  const result = markExportReadiness(session)
  return {
    participant_id: session.participant_id,
    session_id: session.session_id,
    completion_status: result.completion_status,
    export_ready: result.export_ready,
    flags: result.flags,
    validation_issues: result.issues,
    issues: result.issues,
  }
}

export function sessionRecoveryPayload(session: Session) {
  const resume = session.event_log.filter((item) =>
    ['session_resume', 'session_abandon', 'browser_reload', 'visibility_hidden', 'visibility_visible', 'page_exit', 'task_navigate'].includes(
      item.event_type,
    ),
  )
  const taskStarts = new Map<string, number>()
  const taskEnds = new Map<string, number>()
  for (const event of session.event_log) {
    if (event.event_type === 'task_start') taskStarts.set(event.task_id, (taskStarts.get(event.task_id) ?? 0) + 1)
    if (event.event_type === 'task_end') taskEnds.set(event.task_id, (taskEnds.get(event.task_id) ?? 0) + 1)
  }
  return {
    participant_id: session.participant_id,
    session_id: session.session_id,
    session_status: session.session_status,
    completion_status: session.completion_status,
    last_completed_task_id: session.last_completed_task_id,
    current_task_id: session.current_task_id,
    current_stage: session.current_stage,
    current_round: session.current_round,
    current_generation_id: session.current_generation_id,
    current_text_version_id: session.current_text_version_id,
    current_sketch_snapshot_id: session.current_sketch_snapshot_id,
    resume_events: resume,
    duplicate_task_start: [...taskStarts.values()].some((count) => count > 1),
    duplicate_task_end: [...taskEnds.values()].some((count) => count > 1),
    duplicate_generation_ids: new Set(session.generations.map((item) => item.generation_id)).size !== session.generations.length,
  }
}

export function assertExportable(sessions: Session[], requireComplete = true): void {
  const blocking: string[] = []
  for (const session of sessions) {
    const result = markExportReadiness(session)
    if (requireComplete && result.completion_status !== 'complete') {
      blocking.push(`${session.participant_id}: session is incomplete`)
    }
    if (requireComplete && !result.export_ready) {
      blocking.push(
        `${session.participant_id}: ${result.issues.map((item) => `${item.code}${item.task_id ? `@${item.task_id}` : ''}`).join('; ')}`,
      )
    }
  }
  if (blocking.length) {
    const message = `Export is not complete. Fix validation first:\n${blocking.join('\n')}`
    if (typeof window !== 'undefined') window.alert(message)
    throw new Error(message)
  }
}

export function buildExportPayload() {
  const store = loadStore()
  return {
    exported_at: new Date().toISOString(),
    study: experiment.study,
    sessions: store.sessions.map(({ runtime: _runtime, ...rest }) => rest),
    ratings: store.ratings,
    ratings_by_expert: Object.fromEntries(
      experiment.experts.map((expert) => [
        expert.expert_id,
        store.ratings.filter((item) => item.expert_id === expert.expert_id),
      ]),
    ),
    codings: store.codings,
    participants: participantRows(store.sessions),
    tasks: taskRows(store.sessions, store.codings),
    event_log: eventLogRows(store.sessions),
    intents: intentRows(store.sessions, store.codings),
    generations: generationRows(store.sessions),
    sketch_interactions: interactionRows(store.sessions),
    auto_prompts: autoPromptRows(store.sessions),
    text_versions: textVersionRows(store.sessions),
    events: eventLogRows(store.sessions),
    self_alignment: selfAlignmentRows(store.sessions),
    sketch_snapshots: snapshotPayload(store.sessions),
    expert_ratings: expertRows(store.ratings),
    practice_control: practiceControlAnalysis(store.sessions, store.codings),
    timelines: store.sessions.map(timelinePayload),
    validations: store.sessions.map(validationPayload),
    session_recovery: store.sessions.map(sessionRecoveryPayload),
  }
}

export function downloadParticipantCsv(): void {
  download('participants.csv', toCsv(participantRows(loadStore().sessions)), 'text/csv')
}

export function downloadEventsCsv(): void {
  download('events.csv', toCsv(eventLogRows(loadStore().sessions)), 'text/csv')
}

export function downloadTextVersionsCsv(): void {
  download('text_versions.csv', toCsv(textVersionRows(loadStore().sessions)), 'text/csv')
}

export function downloadSelfAlignmentCsv(): void {
  download('self_alignment.csv', toCsv(selfAlignmentRows(loadStore().sessions)), 'text/csv')
}

export function downloadTaskCsv(): void {
  const store = loadStore()
  download('tasks.csv', toCsv(taskRows(store.sessions, store.codings)), 'text/csv')
}

export function downloadEventLogCsv(): void {
  download('event_log.csv', toCsv(eventLogRows(loadStore().sessions)), 'text/csv')
}

export function downloadIntentCsv(): void {
  const store = loadStore()
  download('intents.csv', toCsv(intentRows(store.sessions, store.codings)), 'text/csv')
}

export function downloadGenerationsCsv(): void {
  download('generations.csv', toCsv(generationRows(loadStore().sessions)), 'text/csv')
}

export function downloadSketchInteractionsCsv(): void {
  download('sketch_interactions.csv', toCsv(interactionRows(loadStore().sessions)), 'text/csv')
}

export function downloadAutoPromptsCsv(): void {
  download('auto_prompts.csv', toCsv(autoPromptRows(loadStore().sessions)), 'text/csv')
}

export function downloadSketchSnapshotsJson(): void {
  download('sketch_snapshots.json', JSON.stringify(snapshotPayload(loadStore().sessions), null, 2), 'application/json')
}

export function downloadExpertRatingsCsv(): void {
  download('expert_ratings.csv', toCsv(expertRows(loadStore().ratings)), 'text/csv')
}

export function downloadTimelinesJson(): void {
  download(
    'full_session_timeline.json',
    JSON.stringify(loadStore().sessions.map(timelinePayload), null, 2),
    'application/json',
  )
}

export function officialTableFiles(sessions = loadStore().sessions, ratings = loadStore().ratings, codings = loadStore().codings) {
  const eventLog = toCsv(eventLogRows(sessions))
  const files = [
    { name: 'participants.csv', content: toCsv(participantRows(sessions)) },
    { name: 'tasks.csv', content: toCsv(taskRows(sessions, codings)) },
    { name: 'event_log.csv', content: eventLog },
    { name: 'events.csv', content: eventLog },
    { name: 'text_versions.csv', content: toCsv(textVersionRows(sessions)) },
    { name: 'generations.csv', content: toCsv(generationRows(sessions)) },
    { name: 'sketch_interactions.csv', content: toCsv(interactionRows(sessions)) },
    { name: 'sketch_snapshots.json', content: JSON.stringify(snapshotPayload(sessions), null, 2) },
    { name: 'auto_prompts.csv', content: toCsv(autoPromptRows(sessions)) },
    { name: 'expert_ratings.csv', content: toCsv(expertRows(ratings)) },
    { name: 'expert_dimension_scores.csv', content: toCsv(expertDimensionRows(ratings)) },
    { name: 'self_alignment.csv', content: toCsv(selfAlignmentRows(sessions)) },
    { name: 'full_session_timeline.json', content: JSON.stringify(sessions.map(timelinePayload), null, 2) },
    { name: 'validation.json', content: JSON.stringify(sessions.map(validationPayload), null, 2) },
    { name: 'session_recovery.json', content: JSON.stringify(sessions.map(sessionRecoveryPayload), null, 2) },
  ]
  const names = new Set(files.map((item) => item.name))
  if (!REQUIRED_EXPORT_FILES.every((name) => names.has(name))) {
    throw new Error('official export is missing required study files')
  }
  return files
}

export function downloadOfficialZip(): void {
  const store = loadStore()
  downloadBlob('chitest-official-export.zip', zipStore(officialTableFiles(store.sessions, store.ratings, store.codings)))
}

export function downloadFullJson(): void {
  download('chitest-export.json', JSON.stringify(buildExportPayload(), null, 2), 'application/json')
}

export async function downloadParticipantPacket(session: Session): Promise<void> {
  const validation = markExportReadiness(session)
  if (!validation.export_ready) {
    const message = `Export is not ready for ${session.participant_id} (completion_status=${validation.completion_status}):\n${validation.issues.map((item) => item.message).join('\n')}`
    if (typeof window !== 'undefined') window.alert(message)
  }
  const store = loadStore()
  const imageIds = session.generations.map((item) => item.generation_id)
  const images = await getGeneratedImages(imageIds)
  const ratings = store.ratings.filter((item) => item.participant_id === session.participant_id)
  const codings = store.codings.filter((item) => item.participant_id === session.participant_id)
  const sessionJson = JSON.stringify(
    {
      study: experiment.study.title,
      exported_at: new Date().toISOString(),
      export_ready: session.export_ready,
      validation,
      ...timelinePayload(session),
      demographics: session.demographics,
      tasks: session.tasks,
      text_versions: session.text_versions,
      generations: session.generations.map((item) => ({
        ...item,
        output_image_data: images[item.generation_id] || null,
      })),
      events: eventLogRows([session]),
      sketch_snapshots: session.sketch_snapshots,
      sketch_interactions: interactionRows([session]),
      auto_prompts: autoPromptRows([session]),
      self_alignment: selfAlignmentRows([session]),
      measures: measuresForSession(session),
      task_measures: session.tasks.map((task) => ({
        task_id: task.task_id,
        ...measuresForTask(session, task),
      })),
    },
    null,
    2,
  )
  downloadBlob(
    `${session.participant_id}-packet.zip`,
    zipStore([
      ...officialTableFiles([session], ratings, codings),
      { name: `${session.participant_id}-session.json`, content: sessionJson },
    ]),
  )
}

export { textAt, toCsv }
