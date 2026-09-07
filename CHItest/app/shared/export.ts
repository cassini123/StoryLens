import { experiment } from './config'
import { loadStore } from './store'
import type { ExpertRating, RubricScores, Session, Trial } from './types'

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
    demographics: session.demographics,
    trials: session.trials,
    subjective: session.subjective,
    started_at: session.started_at,
    completed_at: session.completed_at,
  }
}

function flattenScores(prefix: string, scores: RubricScores): Record<string, unknown> {
  return {
    [`${prefix}_intent_precision`]: scores.intent_precision,
    [`${prefix}_intent_interpretability`]: scores.intent_interpretability,
    [`${prefix}_spatial_specificity`]: scores.spatial_specificity,
    [`${prefix}_executability`]: scores.executability,
  }
}

export function flattenTrial(trial: Trial): Record<string, unknown> {
  return {
    participant_id: trial.participant_id,
    trial_id: trial.trial_id,
    task_id: trial.task_id,
    condition: trial.condition,
    initial_intent: trial.initial_intent,
    final_intent: trial.final_intent,
    refined_intent: trial.refined_intent,
    sketch_action_count: trial.sketch_actions.length,
    has_sketch: Boolean(trial.final_sketch || trial.initial_sketch),
    task_start: trial.timestamps.task_start ?? '',
    intent_start: trial.timestamps.intent_start ?? '',
    intent_submit: trial.timestamps.intent_submit ?? '',
    sketch_generated: trial.timestamps.sketch_generated ?? '',
    sketch_first_interaction: trial.timestamps.sketch_first_interaction ?? '',
    sketch_confirm: trial.timestamps.sketch_confirm ?? '',
    refinement_start: trial.timestamps.refinement_start ?? '',
    refinement_submit: trial.timestamps.refinement_submit ?? '',
    trial_end: trial.timestamps.trial_end ?? '',
  }
}

export function flattenRating(rating: ExpertRating): Record<string, unknown> {
  return {
    trial_id: rating.trial_id,
    expert_id: rating.expert_id,
    ...flattenScores('initial', rating.initial),
    ...flattenScores('final', rating.final),
    naturalness: rating.naturalness,
    comment: rating.comment,
    submitted_at: rating.submitted_at,
    precision_gain:
      rating.final.intent_precision != null && rating.initial.intent_precision != null
        ? rating.final.intent_precision - rating.initial.intent_precision
        : '',
    interpretability_gain:
      rating.final.intent_interpretability != null &&
      rating.initial.intent_interpretability != null
        ? rating.final.intent_interpretability - rating.initial.intent_interpretability
        : '',
    spatial_specificity_gain:
      rating.final.spatial_specificity != null && rating.initial.spatial_specificity != null
        ? rating.final.spatial_specificity - rating.initial.spatial_specificity
        : '',
    executability_gain:
      rating.final.executability != null && rating.initial.executability != null
        ? rating.final.executability - rating.initial.executability
        : '',
  }
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
  }
}

export function downloadSessionsJson(): void {
  const payload = buildExportPayload()
  download('chitest-sessions.json', JSON.stringify(payload.sessions, null, 2), 'application/json')
}

export function downloadTrialsJson(): void {
  const payload = buildExportPayload()
  download('chitest-trials.json', JSON.stringify(payload.trials, null, 2), 'application/json')
}

export function downloadTrialsCsv(): void {
  const payload = buildExportPayload()
  download('chitest-trials.csv', toCsv(payload.trials.map(flattenTrial)), 'text/csv')
}

export function downloadRatingsJson(): void {
  const payload = buildExportPayload()
  download(
    'chitest-expert-ratings.json',
    JSON.stringify(payload.ratings_by_expert, null, 2),
    'application/json',
  )
}

export function downloadRatingsCsv(): void {
  const payload = buildExportPayload()
  download('chitest-expert-ratings.csv', toCsv(payload.ratings.map(flattenRating)), 'text/csv')
}

export function downloadFullJson(): void {
  download('chitest-export.json', JSON.stringify(buildExportPayload(), null, 2), 'application/json')
}

export { toCsv }
