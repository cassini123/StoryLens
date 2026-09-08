import type { AssignmentPattern, ImageDef, PlannedTask, Session, Stage, StimulusGroup } from './types'

function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

/** Env, character_space, camera, composition counts. Each row sums to 7. */
export const PATTERN_COUNTS: Record<AssignmentPattern, Record<StimulusGroup, number>> = {
  A: { environment: 2, character_space: 1, camera: 2, composition: 2 },
  B: { environment: 1, character_space: 2, camera: 2, composition: 2 },
  C: { environment: 2, character_space: 2, camera: 1, composition: 2 },
}

export const PATTERNS: AssignmentPattern[] = ['A', 'B', 'C']

export function patternForParticipant(participantId: string): AssignmentPattern {
  const n = Number(/^P(\d+)$/i.exec(participantId)?.[1] ?? hashString(participantId))
  return PATTERNS[(n - 1 + PATTERNS.length) % PATTERNS.length]
}

function pickFromGroup(
  pool: ImageDef[],
  group: StimulusGroup,
  count: number,
  rand: () => number,
  used: Set<string>,
): ImageDef[] {
  const available = shuffle(
    pool.filter((item) => item.group === group && !used.has(item.image_id)),
    rand,
  )
  const picked = available.slice(0, count)
  if (picked.length < count) {
    throw new Error(`Not enough ${group} images for stratified assignment`)
  }
  for (const item of picked) used.add(item.image_id)
  return picked
}

function assignStages(picked: ImageDef[], rand: () => number): PlannedTask[] {
  const mixed = shuffle(picked, rand)
  const stages: Stage[] = ['T0', 'T1', 'T1', 'T2', 'T2', 'T3', 'T3']
  return mixed.map((image, index) => ({
    task_id: `${stages[index]}_${image.image_id}`,
    image_id: image.image_id,
    stage: stages[index],
  }))
}

export function assignImages(
  images: ImageDef[],
  participantId: string,
  pattern: AssignmentPattern = patternForParticipant(participantId),
): PlannedTask[] {
  const rand = mulberry32(hashString(`${participantId}:${pattern}`))
  const used = new Set<string>()
  const counts = PATTERN_COUNTS[pattern]
  const picked = (Object.keys(counts) as StimulusGroup[]).flatMap((group) =>
    pickFromGroup(images, group, counts[group], rand, used),
  )
  if (picked.length !== 7) throw new Error('Expected 7 stratified images')
  const plan = assignStages(picked, rand)
  const ids = plan.map((item) => item.image_id)
  if (new Set(ids).size !== 7) throw new Error('Image assignment reused an image')
  const groups = new Set(plan.map((item) => images.find((image) => image.image_id === item.image_id)?.group))
  if (groups.size < 4) throw new Error('Assignment did not cover all stimulus groups')
  return plan
}

export function shortPlan(plan: PlannedTask[]): PlannedTask[] {
  const t0 = plan.find((item) => item.stage === 'T0')
  const t1 = plan.find((item) => item.stage === 'T1')
  const t2 = plan.find((item) => item.stage === 'T2')
  const t3 = plan.find((item) => item.stage === 'T3')
  return [t0, t1, t2, t3].filter((item): item is PlannedTask => Boolean(item))
}

export function nextParticipantId(sessions: Session[]): string {
  const max = sessions.reduce((acc, session) => {
    const match = /^P(\d+)$/i.exec(session.participant_id)
    if (!match) return acc
    return Math.max(acc, Number(match[1]))
  }, 0)
  return `P${String(max + 1).padStart(3, '0')}`
}

export function nextSessionId(participantId: string): string {
  return `S${participantId.replace(/^P/i, '')}`
}
