import {
  MAX_ROUNDS,
  STAGE_SEQUENCE,
  TASK_SEQUENCE_VERSION,
  type ExperimentalGroup,
  type Session,
  type Stage,
  type TaskRun,
} from './types'
import type { PlannedTask } from './types'

export { TASK_SEQUENCE_VERSION }

export const CANONICAL_SKETCH_ACTIONS = [
  'move',
  'move_object',
  'add',
  'delete',
  'rotate',
  'resize',
  'change_direction',
  'change_gaze',
  'change_layer',
  'change_distance',
  'camera_move',
  'camera_rotate',
] as const

const ACTION_ALIASES: Record<string, (typeof CANONICAL_SKETCH_ACTIONS)[number]> = {
  move: 'move',
  move_subject: 'move',
  move_object: 'move_object',
  add: 'add',
  add_subject: 'add',
  add_object: 'add',
  add_person: 'add',
  delete: 'delete',
  delete_subject: 'delete',
  delete_object: 'delete',
  rotate: 'rotate',
  rotate_subject: 'rotate',
  resize: 'resize',
  change_direction: 'change_direction',
  movement_update: 'change_direction',
  movement_add: 'change_direction',
  change_gaze: 'change_gaze',
  gaze_add: 'change_gaze',
  gaze_delete: 'change_gaze',
  change_layer: 'change_layer',
  change_depth: 'change_layer',
  change_distance: 'change_distance',
  camera_distance: 'change_distance',
  camera_move: 'camera_move',
  camera_rotate: 'camera_rotate',
  movement_delete: 'delete',
}

export function stageCapabilities(stage: Stage): {
  ai_enabled: boolean
  sketch_enabled: boolean
  auto_prompt_enabled: boolean
} {
  if (stage === 'T0') {
    return { ai_enabled: false, sketch_enabled: false, auto_prompt_enabled: false }
  }
  if (stage === 'T2') {
    return { ai_enabled: true, sketch_enabled: true, auto_prompt_enabled: true }
  }
  return { ai_enabled: true, sketch_enabled: false, auto_prompt_enabled: false }
}

export function conditionOrderFor(group: ExperimentalGroup): Stage[] {
  return [...STAGE_SEQUENCE[group]]
}

export function planMatchesGroup(plan: PlannedTask[], group: ExperimentalGroup): boolean {
  const expected = STAGE_SEQUENCE[group]
  if (plan.length !== expected.length) return false
  return plan.every((item, index) => item.stage === expected[index])
}

export function normalizeSketchActionType(raw: string): string {
  return ACTION_ALIASES[raw] ?? raw
}

export function associatedGenerationRound(currentRound: number): number {
  return Math.max(1, currentRound + 1)
}

export function isFormalSequenceVersion(version: string): boolean {
  return version === TASK_SEQUENCE_VERSION
}

export function isSystemTextType(textType: string): boolean {
  return textType === 'auto' || textType === 'auto_interpretation'
}

export function lastAutoPrompt(session: Session, taskId: string) {
  const autos = session.auto_prompts.filter((item) => item.task_id === taskId)
  return autos[autos.length - 1] ?? null
}

export function t2NeedsGenerationAfterInterpret(session: Session, task: TaskRun): boolean {
  if (task.stage !== 'T2') return false
  const lastAuto = lastAutoPrompt(session, task.task_id)
  if (!lastAuto) return false
  const gens = session.generations.filter((item) => item.task_id === task.task_id && item.success)
  const lastGen = gens[gens.length - 1]
  if (!lastGen) return true
  return Date.parse(lastGen.timestamp_end) < Date.parse(lastAuto.timestamp_generated)
}

export function t2ScaffoldLoopComplete(session: Session, task: TaskRun): boolean {
  if (task.stage !== 'T2') return true
  const gens = session.generations
    .filter((item) => item.task_id === task.task_id && item.success)
    .sort((a, b) => a.round - b.round)
  const autos = session.auto_prompts.filter((item) => item.task_id === task.task_id)
  if (gens.length < 2) return false
  if (!autos.length) return false
  if (!task.sketch_actions.length) return false
  const lastAuto = autos[autos.length - 1]
  const lastGen = gens[gens.length - 1]
  const prevGen = gens[gens.length - 2]
  if (Date.parse(lastGen.timestamp_end) < Date.parse(lastAuto.timestamp_generated)) return false
  if (lastGen.input_image_id === task.image_id && lastGen.previous_generation_id == null) return false
  return lastGen.previous_generation_id === prevGen.generation_id || lastGen.input_image_id === prevGen.output_image_id
}

export function canSatisfyTask(session: Session, task: TaskRun, draftText: string): boolean {
  if (task.stage === 'T0') return draftText.trim().length > 0
  const hasGen = session.generations.some((item) => item.task_id === task.task_id && item.success)
  if (!hasGen) return false
  if (task.stage === 'T2') return t2ScaffoldLoopComplete(session, task)
  return true
}

export function canAttemptGeneration(session: Session, task: TaskRun): boolean {
  if (!task.ai_enabled) return false
  if (session.runtime.step === 'generating') return false
  if (session.runtime.round < MAX_ROUNDS) return true
  return !canSatisfyTask(session, task, session.runtime.draft_text)
}

export function canAttemptInterpret(session: Session, task: TaskRun): boolean {
  if (task.stage !== 'T2') return false
  if (!task.auto_prompt_enabled) return false
  if (!session.runtime.working_scene) return false
  if (session.runtime.step === 'generating') return false
  return true
}
