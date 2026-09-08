import { assignGroup, assignImages, groupCode, groupSequence, nextParticipantId, patternForParticipant, shortPlan } from './assign'
import { experiment, images } from './config'
import { conditionOrderFor } from './protocol'
import type { ExperimentalGroup, PlannedTask } from './types'

export function isShortSession(): boolean {
  if (experiment.debug_short_session) return true
  if (typeof window === 'undefined') return false
  return /(?:\?|&)short=1\b/.test(window.location.hash)
}

export function buildTaskPlan(participantId = 'P000', group: ExperimentalGroup): PlannedTask[] {
  const plan = assignImages(images, participantId, patternForParticipant(participantId), group)
  return isShortSession() ? shortPlan(plan) : plan
}

export { assignGroup, conditionOrderFor, groupCode, groupSequence, nextParticipantId, patternForParticipant }
