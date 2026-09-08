import type { ExpertRating, IntentCoding, Session, StoreShape, Trial } from './types'

const KEY = 'chitest.store.v3'
const LEGACY_KEYS = ['chitest.store.v2', 'chitest.store.v1']
const ACTIVE_KEY = 'chitest.activeParticipantId'

function emptyStore(): StoreShape {
  return { sessions: [], ratings: [], codings: [] }
}

function migrateTrial(raw: Trial): Trial {
  return {
    ...raw,
    image_id: raw.image_id || raw.task_id,
    phase: raw.phase || (raw.condition === 'transfer' ? 'T3' : 'T2'),
    condition: raw.condition === 'direct' || raw.condition === 'sketch' || raw.condition === 'transfer' || raw.condition === 'baseline'
      ? raw.condition
      : 'baseline',
    t1_intent: raw.t1_intent || raw.initial_intent || '',
    t2_intent: raw.t2_intent || raw.final_intent || raw.refined_intent || '',
    t3_intent: raw.condition === 'transfer' ? raw.t3_intent || raw.final_intent || raw.initial_intent || '' : raw.t3_intent || '',
    refined_intent: raw.refined_intent || raw.final_intent || raw.t2_intent || '',
    refined_intent_timestamp: raw.refined_intent_timestamp || '',
    generated_image: raw.generated_image ?? null,
    semantic_confirms: raw.semantic_confirms ?? [],
    authored: raw.authored ?? {
      modification_count: raw.sketch_actions?.length ?? 0,
      rejection: (raw.sketch_actions?.length ?? 0) > 0,
    },
  }
}

function migrateSession(raw: Session): Session {
  return {
    ...raw,
    group_id: raw.group_id === 'sketch_first' ? 'sketch_first' : 'direct_first',
    condition_order: raw.condition_order ?? raw.group_id,
    demographics: {
      cinematography_experience: raw.demographics.cinematography_experience || raw.demographics.ai_experience || '',
      cinematography_years: raw.demographics.cinematography_years || raw.demographics.film_years || '',
      visual_experience: raw.demographics.visual_experience || '',
      ai_familiarity: raw.demographics.ai_familiarity || raw.demographics.ai_experience || '',
      design_background: raw.demographics.design_background ?? null,
      film_background: raw.demographics.film_background ?? null,
      film_years: raw.demographics.film_years || '',
      ai_experience: raw.demographics.ai_experience || '',
      image_gen_experience: raw.demographics.image_gen_experience || '',
    },
    trials: raw.trials.map(migrateTrial),
    runtime: {
      step: raw.runtime?.step || 'intro',
      trial_index: raw.runtime?.trial_index ?? 0,
      draft_initial: raw.runtime?.draft_initial || '',
      draft_final: raw.runtime?.draft_final || '',
      working_scene: raw.runtime?.working_scene ?? null,
      generate_error: raw.runtime?.generate_error || '',
      selected_node_id: raw.runtime?.selected_node_id ?? null,
    },
  }
}

export function loadStore(): StoreShape {
  try {
    let raw: string | null = localStorage.getItem(KEY)
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        raw = localStorage.getItem(key)
        if (raw) break
      }
    }
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as StoreShape
    return {
      sessions: (parsed.sessions ?? []).map(migrateSession),
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
