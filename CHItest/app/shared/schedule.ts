import { assignImages, groupForParticipant, nextParticipantId, patternForParticipant, shortPlan } from './assign'
import { experiment, images } from './config'
import type { PlannedTask } from './types'

function shortSession(): boolean {
  if (experiment.debug_short_session) return true
  if (typeof window === 'undefined') return false
  return /(?:\?|&)short=1\b/.test(window.location.hash)
}

export function buildTaskPlan(participantId = 'P000'): PlannedTask[] {
  const group = groupForParticipant(participantId)
  const plan = assignImages(images, participantId, patternForParticipant(participantId), group)
  return shortSession() ? shortPlan(plan) : plan
}

export { groupForParticipant, nextParticipantId, patternForParticipant }
