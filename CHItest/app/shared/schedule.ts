import { experiment } from './config'
import type { GroupId, PlannedTrial, Session } from './types'

function shortSession(): boolean {
  if (experiment.debug_short_session) return true
  if (typeof window === 'undefined') return false
  return /(?:\?|&)short=1\b/.test(window.location.hash)
}

export function buildTrialPlan(groupId: GroupId): PlannedTrial[] {
  const group = experiment.groups[groupId]
  const direct: PlannedTrial[] = group.direct.map((task_id) => ({
    task_id,
    condition: 'direct',
  }))
  const sketch: PlannedTrial[] = group.sketch.map((task_id) => ({
    task_id,
    condition: 'sketch',
  }))
  const plan =
    group.condition_order === 'direct_first' ? [...direct, ...sketch] : [...sketch, ...direct]
  if (!shortSession()) return plan
  const firstDirect = plan.find((item) => item.condition === 'direct')
  const firstSketch = plan.find((item) => item.condition === 'sketch')
  return [firstDirect, firstSketch].filter((item): item is PlannedTrial => Boolean(item))
}

export function nextGroupId(sessions: Session[]): GroupId {
  const ids = Object.keys(experiment.groups) as GroupId[]
  return ids[sessions.length % ids.length]
}

export function nextParticipantId(sessions: Session[]): string {
  const max = sessions.reduce((acc, session) => {
    const match = /^P(\d+)$/i.exec(session.participant_id)
    if (!match) return acc
    return Math.max(acc, Number(match[1]))
  }, 0)
  return `P${String(max + 1).padStart(3, '0')}`
}
