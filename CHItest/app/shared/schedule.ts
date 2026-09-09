import {
  assignGroup,
  assignImages,
  groupCode,
  groupSequence,
  nextParticipantId,
  randomPattern,
  shortPlan,
} from './assign'
import { experiment, images } from './config'
import { conditionOrderFor } from './protocol'
import type { AssignmentPattern, ExperimentalGroup, PlannedTask } from './types'

export function isShortSession(): boolean {
  if (experiment.debug_short_session) return true
  if (typeof window === 'undefined') return false
  return /(?:\?|&)short=1\b/.test(window.location.hash)
}

export function buildTaskPlan(
  participantId = 'P000',
  group: ExperimentalGroup,
  pattern: AssignmentPattern = randomPattern(),
  seed?: number,
): PlannedTask[] {
  const plan = assignImages(images, participantId, pattern, group, seed)
  return isShortSession() ? shortPlan(plan) : plan
}

export { assignGroup, conditionOrderFor, groupCode, groupSequence, nextParticipantId, randomPattern }
