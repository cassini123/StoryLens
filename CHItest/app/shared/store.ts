import { logEvent } from './logging'
import { syncSessionCursor } from './sessionInit'
import { clearGeneratedImages } from './imageStore'
import type { ExpertRating, IntentCoding, Session, StoreShape, TaskRun } from './types'

const KEY = 'chitest.store.v8'
const LEGACY_KEYS = [
  'chitest.store.v7',
  'chitest.store.v6',
  'chitest.store.v5',
  'chitest.store.v4',
  'chitest.store.v3',
  'chitest.store.v2',
  'chitest.store.v1',
]
const ACTIVE_KEY = 'chitest.activeParticipantId'

function emptyStore(): StoreShape {
  return { sessions: [], ratings: [], codings: [] }
}

export function loadStore(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      for (const key of LEGACY_KEYS) localStorage.removeItem(key)
      return emptyStore()
    }
    const parsed = JSON.parse(raw) as StoreShape
    return {
      sessions: parsed.sessions ?? [],
      ratings: parsed.ratings ?? [],
      codings: parsed.codings ?? [],
    }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: StoreShape): void {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function upsertSession(session: Session): StoreShape {
  syncSessionCursor(session)
  const store = loadStore()
  const index = store.sessions.findIndex((item) => item.session_id === session.session_id)
  if (index >= 0) store.sessions[index] = session
  else store.sessions.push(session)
  saveStore(store)
  if (session.session_status !== 'abandoned' && !session.completed_at) {
    localStorage.setItem(ACTIVE_KEY, session.session_id)
  } else if (localStorage.getItem(ACTIVE_KEY) === session.session_id) {
    localStorage.removeItem(ACTIVE_KEY)
  }
  return store
}

export function sessionsForParticipant(participantId: string): Session[] {
  return loadStore().sessions.filter((item) => item.participant_id === participantId)
}

export function getSession(participantId: string): Session | undefined {
  const sessions = sessionsForParticipant(participantId)
  return (
    sessions.find((item) => item.session_status !== 'abandoned' && !item.completed_at) ??
    sessions.find((item) => Boolean(item.completed_at)) ??
    sessions[sessions.length - 1]
  )
}

export function getActiveSession(): Session | undefined {
  const id = localStorage.getItem(ACTIVE_KEY)
  if (!id) return undefined
  const session = loadStore().sessions.find((item) => item.session_id === id)
  if (session && !session.completed_at && session.session_status !== 'abandoned') return session
  return undefined
}

export function clearActiveSession(): void {
  localStorage.removeItem(ACTIVE_KEY)
}

export function upsertRating(rating: ExpertRating): StoreShape {
  const store = loadStore()
  const index = store.ratings.findIndex(
    (item) => item.trial_id === rating.trial_id && item.expert_id === rating.expert_id,
  )
  if (index >= 0) store.ratings[index] = rating
  else store.ratings.push(rating)
  saveStore(store)
  return store
}

export function upsertCoding(coding: IntentCoding): StoreShape {
  const store = loadStore()
  const index = store.codings.findIndex(
    (item) =>
      item.trial_id === coding.trial_id &&
      item.timepoint === coding.timepoint &&
      item.coder_id === coding.coder_id,
  )
  if (index >= 0) store.codings[index] = coding
  else store.codings.push(coding)
  saveStore(store)
  return store
}

export function ratingsForExpert(expertId: string): ExpertRating[] {
  return loadStore().ratings.filter((item) => item.expert_id === expertId)
}

export function allCompletedTrials(): TaskRun[] {
  return loadStore().sessions.flatMap((session) => session.tasks.filter((task) => Boolean(task.ended_at)))
}

export function abandonSession(participantId: string): StoreShape {
  const store = loadStore()
  const session = store.sessions.find(
    (item) => item.participant_id === participantId && item.session_status !== 'abandoned' && !item.completed_at,
  )
  if (!session) return store
  session.session_status = 'abandoned'
  session.completion_status = 'incomplete'
  session.export_ready = false
  logEvent(session, 'session_abandon', { kept: true })
  syncSessionCursor(session)
  saveStore(store)
  if (localStorage.getItem(ACTIVE_KEY) === session.session_id) {
    localStorage.removeItem(ACTIVE_KEY)
  }
  return store
}

export function clearAllData(): StoreShape {
  const store = emptyStore()
  saveStore(store)
  localStorage.removeItem(ACTIVE_KEY)
  void clearGeneratedImages()
  return store
}
