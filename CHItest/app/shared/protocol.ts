import { STAGE_SEQUENCE, TASK_SEQUENCE_VERSION, type ExperimentalGroup, type Stage } from './types'
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
