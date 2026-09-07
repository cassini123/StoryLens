import type { ExpertRating, Session, StoreShape } from './types'

const KEY = 'chitest.store.v1'
const ACTIVE_KEY = 'chitest.activeParticipantId'

function emptyStore(): StoreShape {
  return { sessions: [], ratings: [] }
}

export function loadStore(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as StoreShape
    return {
      sessions: parsed.sessions ?? [],
      ratings: parsed.ratings ?? [],
    }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: StoreShape): void {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function upsertSession(session: Session): StoreShape {
  const store = loadStore()
  const index = store.sessions.findIndex((item) => item.participant_id === session.participant_id)
  if (index >= 0) store.sessions[index] = session
  else store.sessions.push(session)
  saveStore(store)
  if (!session.completed_at) {
    localStorage.setItem(ACTIVE_KEY, session.participant_id)
  } else {
    localStorage.removeItem(ACTIVE_KEY)
  }
  return store
}

export function getSession(participantId: string): Session | undefined {
  return loadStore().sessions.find((item) => item.participant_id === participantId)
}

export function getActiveSession(): Session | undefined {
  const id = localStorage.getItem(ACTIVE_KEY)
  if (!id) return undefined
  const session = getSession(id)
  if (session && !session.completed_at) return session
  return undefined
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

export function ratingsForExpert(expertId: string): ExpertRating[] {
  return loadStore().ratings.filter((item) => item.expert_id === expertId)
}

export function allCompletedTrials() {
  return loadStore().sessions.flatMap((session) =>
    session.trials.filter((trial) => Boolean(trial.timestamps.trial_end)),
  )
}

export function clearAllData(): StoreShape {
  const store = emptyStore()
  saveStore(store)
  localStorage.removeItem(ACTIVE_KEY)
  return store
}
