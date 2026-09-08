import { assignImages, nextGroupId, nextParticipantId, shortPlan } from './assign'
import { experiment, images } from './config'
import type { GroupId, PlannedTrial } from './types'

function shortSession(): boolean {
  if (experiment.debug_short_session) return true
  if (typeof window === 'undefined') return false
  return /(?:\?|&)short=1\b/.test(window.location.hash)
}

export function buildTrialPlan(groupId: GroupId, participantId = 'P000'): PlannedTrial[] {
  const plan = assignImages(images, participantId, groupId)
  return shortSession() ? shortPlan(plan) : plan
}

export { nextGroupId, nextParticipantId }
