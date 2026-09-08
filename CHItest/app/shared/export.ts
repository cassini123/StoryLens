import { experiment, getTask } from './config'
import {
  discoveryRate,
  learningGain,
  mean,
  precisionTotal,
  transferGain,
} from './metrics'
import { loadStore } from './store'
import type { ExpertRating, IntentCoding, Session, Timepoint, Trial } from './types'

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

function exportableSession(session: Session): Omit<Session, 'runtime'> {
  return {
    participant_id: session.participant_id,
    group_id: session.group_id,
    condition_order: session.condition_order,
    demographics: session.demographics,
    trials: session.trials,
    subjective: session.subjective,
    started_at: session.started_at,
    completed_at: session.completed_at,
  }
}

function conditionLabel(condition: Trial['condition']): string {
  if (condition === 'direct') return 'DIRECT'
  if (condition === 'sketch') return 'SKETCH'
  return 'TRANSFER'
}

function intentText(trial: Trial, timepoint: Timepoint): string {
  if (timepoint === 'T1') return trial.t1_intent || trial.initial_intent
  if (timepoint === 'T2') return trial.t2_intent || trial.final_intent
  return trial.t3_intent || trial.final_intent || trial.initial_intent
}

function codingFor(
  codings: IntentCoding[],
  trialId: string,
  timepoint: Timepoint,
): IntentCoding | undefined {
  return codings.find((item) => item.trial_id === trialId && item.timepoint === timepoint)
}

export function participantRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.map((session) => ({
    participant_id: session.participant_id,
    condition_order: session.condition_order || session.group_id,
    background: session.demographics.visual_experience,
    AI_familiarity: session.demographics.ai_familiarity || session.demographics.ai_experience,
    cinematography_experience:
      session.demographics.cinematography_experience ||
      (session.demographics.film_background ? 'some' : 'none'),
    visual_experience: session.demographics.visual_experience,
    cinematography_years:
      session.demographics.cinematography_years || session.demographics.film_years,
    group_id: session.group_id,
    started_at: session.started_at,
    completed_at: session.completed_at ?? '',
  }))
}

export function intentRows(sessions: Session[], codings: IntentCoding[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (const session of sessions) {
    const t1Totals: Array<number | null> = []
    for (const trial of session.trials) {
      if (trial.condition === 'transfer') continue
      const t1 = codingFor(codings, trial.trial_id, 'T1')
      const t2 = codingFor(codings, trial.trial_id, 'T2')
      const p1 = t1?.precision_total ?? precisionTotal(t1?.precision ?? { object: null, spatial: null, relation: null, camera: null, emotion: null, constraint: null })
      const p2 = t2?.precision_total ?? null
      t1Totals.push(p1)
      const task = getTask(trial.task_id)
      const discovery = t1 && t2 ? discoveryRate(t1.precision, t2.precision, task.required_dimensions) : null
      const gain = learningGain(p1 ?? null, p2 ?? null)
      for (const timepoint of ['T1', 'T2'] as Timepoint[]) {
        const coding = codingFor(codings, trial.trial_id, timepoint)
        rows.push({
          participant_id: trial.participant_id,
          task_id: trial.task_id,
          condition: conditionLabel(trial.condition),
          timepoint,
          intent_text: intentText(trial, timepoint),
          precision_object: coding?.precision.object ?? '',
          precision_spatial: coding?.precision.spatial ?? '',
          precision_relation: coding?.precision.relation ?? '',
          precision_camera: coding?.precision.camera ?? '',
          precision_emotion: coding?.precision.emotion ?? '',
          precision_constraint: coding?.precision.constraint ?? '',
          precision_total: coding?.precision_total ?? '',
          naturalness: coding?.naturalness ?? '',
          copying: coding?.copying ?? '',
          discovery_rate: timepoint === 'T2' ? (discovery ?? '') : '',
          learning_gain: timepoint === 'T2' ? (gain ?? '') : '',
          transfer_gain: '',
        })
      }
    }
    const transfer = session.trials.find((trial) => trial.condition === 'transfer')
    if (transfer) {
      const t3 = codingFor(codings, transfer.trial_id, 'T3')
      const p3 = t3?.precision_total ?? null
      const p1mean = mean(t1Totals)
      rows.push({
        participant_id: transfer.participant_id,
        task_id: transfer.task_id,
        condition: 'TRANSFER',
        timepoint: 'T3',
        intent_text: intentText(transfer, 'T3'),
        precision_object: t3?.precision.object ?? '',
        precision_spatial: t3?.precision.spatial ?? '',
        precision_relation: t3?.precision.relation ?? '',
        precision_camera: t3?.precision.camera ?? '',
        precision_emotion: t3?.precision.emotion ?? '',
        precision_constraint: t3?.precision.constraint ?? '',
        precision_total: p3 ?? '',
        naturalness: t3?.naturalness ?? '',
        copying: '',
        discovery_rate: '',
        learning_gain: '',
        transfer_gain: transferGain(p3, p1mean) ?? '',
      })
    }
  }
  return rows
}

export function interactionRows(sessions: Session[]): Record<string, unknown>[] {
  return sessions.flatMap((session) =>
    session.trials.flatMap((trial) =>
      trial.sketch_actions.map((action) => ({
        participant_id: trial.participant_id,
        task_id: trial.task_id,
        condition: conditionLabel(trial.condition),
        timestamp: action.timestamp,
        action_type: action.action_type || action.action,
        target_id: action.target_id || action.target,
        before_state: JSON.stringify(action.before_state ?? action.from ?? null),
        after_state: JSON.stringify(action.after_state ?? action.to ?? null),
      })),
    ),
  )
}

export function expertRows(ratings: ExpertRating[]): Record<string, unknown>[] {
  return ratings.flatMap((rating) => {
    const participant_id = rating.participant_id || rating.trial_id.split('_')[0]
    const task_id = rating.task_id || rating.trial_id.split('_').slice(1).join('_')
    return [
      {
        task_id,
        participant_id,
        expert_id: rating.expert_id,
        timepoint: 'T1',
        precision: rating.initial.intent_precision,
        interpretability: rating.initial.intent_interpretability,
        spatial_specificity: rating.initial.spatial_specificity,
        executability: rating.initial.executability,
        comment: rating.comment,
      },
      {
        task_id,
        participant_id,
        expert_id: rating.expert_id,
        timepoint: rating.task_id === experiment.transfer_task_id || task_id === experiment.transfer_task_id ? 'T3' : 'T2',
        precision: rating.final.intent_precision,
        interpretability: rating.final.intent_interpretability,
        spatial_specificity: rating.final.spatial_specificity,
        executability: rating.final.executability,
        comment: rating.comment,
      },
    ]
  })
}

export function buildExportPayload() {
  const store = loadStore()
  const sessions = store.sessions.map(exportableSession)
  const trials = store.sessions.flatMap((session) => session.trials)
  const ratingsByExpert: Record<string, ExpertRating[]> = {}
  for (const expert of experiment.experts) {
    ratingsByExpert[expert.expert_id] = store.ratings.filter(
      (item) => item.expert_id === expert.expert_id,
    )
  }
  return {
    exported_at: new Date().toISOString(),
    sessions,
    trials,
    ratings: store.ratings,
    ratings_by_expert: ratingsByExpert,
    codings: store.codings,
    participant: participantRows(store.sessions),
    intent: intentRows(store.sessions, store.codings),
    sketch_interactions: interactionRows(store.sessions),
    expert_ratings: expertRows(store.ratings),
  }
}

export function downloadParticipantCsv(): void {
  download('participant.csv', toCsv(participantRows(loadStore().sessions)), 'text/csv')
}

export function downloadIntentCsv(): void {
  const store = loadStore()
  download('intent.csv', toCsv(intentRows(store.sessions, store.codings)), 'text/csv')
}

export function downloadSketchInteractionsCsv(): void {
  download('sketch_interactions.csv', toCsv(interactionRows(loadStore().sessions)), 'text/csv')
}

export function downloadExpertRatingsCsv(): void {
  download('expert_ratings.csv', toCsv(expertRows(loadStore().ratings)), 'text/csv')
}

export function downloadFullJson(): void {
  download('chitest-export.json', JSON.stringify(buildExportPayload(), null, 2), 'application/json')
}

export { toCsv }
