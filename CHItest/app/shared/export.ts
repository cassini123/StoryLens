import { experiment, getImage } from './config'
import { getGeneratedImages } from './imageStore'
import { measuresForSession, measuresForTask } from './behavior'
import { aiFeedbackGain, mean, sketchGain, transferGain, withinTaskDelta } from './metrics'
import { loadStore } from './store'
import type { IntentCoding, Session, Stage, TaskRun, Timepoint } from './types'

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

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
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
      return {
        participant_id: session.participant_id,
        session_id: session.session_id,
        task_id: task.task_id,
        stage: task.stage,
        image_id: task.image_id,
        group: image.group,
        difficulty: image.difficulty,
        round_count: task.rounds.length,
        satisfied_round: task.satisfied_round ?? '',
        started_at: task.started_at,
        ended_at: task.ended_at,
        P_initial: pInitial ?? '',
        P_final: pFinal ?? '',
        delta_P: withinTaskDelta(pFinal, pInitial) ?? '',
        ...measuresForTask(session, task),
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
      const coding = codings.find(
        (item) =>
          item.trial_id === version.task_id &&
          item.timepoint === (version.text_type === 'initial' ? 'initial' : 'final') &&
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
      input_text: item.input_text,
      input_sketch_snapshot_id: item.input_sketch_snapshot_id,
      output_image_id: item.output_image_id,
      success: item.success,
      error: item.error,
    })),
  )
}

export function autoPromptRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.flatMap((session) =>
    session.tasks.flatMap((task) => {
      const autos = session.text_versions.filter((item) => item.task_id === task.task_id && item.text_type === 'auto')
      const users = session.text_versions.filter(
        (item) => item.task_id === task.task_id && (item.text_type === 'refined' || item.text_type === 'final'),
      )
      const rounds = [...new Set([...autos, ...users].map((item) => item.round))].sort((a, b) => a - b)
      return rounds
        .map((round) => {
          const pAuto = [...autos].reverse().find((item) => item.round === round)
          const pUser = [...users].reverse().find((item) => item.round === round)
          if (!pAuto && !pUser) return null
          return {
            participant_id: session.participant_id,
            session_id: session.session_id,
            task_id: task.task_id,
            stage: task.stage,
            image_id: task.image_id,
            round,
            p_auto: pAuto?.text ?? '',
            p_auto_id: pAuto?.text_version_id ?? '',
            p_auto_length: pAuto?.text_length ?? '',
            p_auto_timestamp: pAuto?.timestamp ?? '',
            p_user: pUser?.text ?? '',
            p_user_id: pUser?.text_version_id ?? '',
            p_user_length: pUser?.text_length ?? '',
            p_user_timestamp: pUser?.timestamp ?? '',
          }
        })
        .filter((row): row is NonNullable<typeof row> => row != null)
    }),
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
        action_type: action.action_type,
        target_id: action.target_id,
        before_state: JSON.stringify(action.before_state ?? null),
        after_state: JSON.stringify(action.after_state ?? null),
      })),
    ),
  )
}

export function expertRows(ratings: ReturnType<typeof loadStore>['ratings']): Record<string, unknown>[] {
  return ratings.flatMap((rating) => [
    {
      task_id: rating.task_id,
      participant_id: rating.participant_id,
      stage: rating.stage,
      expert_id: rating.expert_id,
      timepoint: 'initial',
      precision: rating.initial.intent_precision,
      interpretability: rating.initial.intent_interpretability,
      spatial_specificity: rating.initial.spatial_specificity,
      executability: rating.initial.executability,
      naturalness: rating.naturalness,
      comment: rating.comment,
    },
    {
      task_id: rating.task_id,
      participant_id: rating.participant_id,
      stage: rating.stage,
      expert_id: rating.expert_id,
      timepoint: 'final',
      precision: rating.final.intent_precision,
      interpretability: rating.final.intent_interpretability,
      spatial_specificity: rating.final.spatial_specificity,
      executability: rating.final.executability,
      naturalness: rating.naturalness,
      comment: rating.comment,
    },
  ])
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

export function timelinePayload(session: Session) {
  return {
    participant_id: session.participant_id,
    session_id: session.session_id,
    session_start: session.started_at,
    session_end: session.completed_at,
    assignment_pattern: session.assignment_pattern,
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
    sketch_snapshots: snapshotPayload(store.sessions),
    expert_ratings: expertRows(store.ratings),
    timelines: store.sessions.map(timelinePayload),
  }
}

export function downloadParticipantCsv(): void {
  download('participants.csv', toCsv(participantRows(loadStore().sessions)), 'text/csv')
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

export function downloadFullJson(): void {
  download('chitest-export.json', JSON.stringify(buildExportPayload(), null, 2), 'application/json')
}

export async function downloadParticipantPacket(session: Session): Promise<void> {
  const imageIds = session.generations.map((item) => item.generation_id)
  const images = await getGeneratedImages(imageIds)
  download(
    `${session.participant_id}-session.json`,
    JSON.stringify(
      {
        study: experiment.study.title,
        exported_at: new Date().toISOString(),
        ...timelinePayload(session),
        demographics: session.demographics,
        tasks: session.tasks,
        text_versions: session.text_versions,
        generations: session.generations.map((item) => ({
          ...item,
          output_image_data: images[item.generation_id] || null,
        })),
        sketch_snapshots: session.sketch_snapshots,
        sketch_interactions: interactionRows([session]),
        auto_prompts: autoPromptRows([session]),
        measures: measuresForSession(session),
      },
      null,
      2,
    ),
    'application/json',
  )
}

export { textAt, toCsv }
