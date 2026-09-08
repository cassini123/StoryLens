import type { Condition, Difficulty, GroupId, ImageDef, PlannedTrial, Session, TaskType } from './types'

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

const PATTERNS: Array<[Difficulty, Difficulty]> = [
  ['L1', 'L2'],
  ['L2', 'L3'],
  ['L1', 'L3'],
]

function pickDiverse(pool: ImageDef[], count: number, rand: () => number, used: Set<string>): ImageDef[] {
  const available = shuffle(
    pool.filter((item) => !used.has(item.image_id)),
    rand,
  )
  const picked: ImageDef[] = []
  const types = new Set<TaskType>()
  for (const item of available) {
    if (picked.length >= count) break
    if (types.has(item.task_type)) continue
    picked.push(item)
    types.add(item.task_type)
    used.add(item.image_id)
  }
  for (const item of available) {
    if (picked.length >= count) break
    if (used.has(item.image_id) && picked.some((row) => row.image_id === item.image_id)) continue
    if (picked.some((row) => row.image_id === item.image_id)) continue
    picked.push(item)
    used.add(item.image_id)
  }
  return picked
}

export function assignImages(images: ImageDef[], participantId: string, groupId: GroupId): PlannedTrial[] {
  const rand = mulberry32(hashString(participantId))
  const pattern = PATTERNS[hashString(participantId) % PATTERNS.length]
  const used = new Set<string>()
  const byDiff = (difficulty: Difficulty) => images.filter((item) => item.difficulty === difficulty)
  const first = pickDiverse(byDiff(pattern[0]), 3, rand, used)
  const second = pickDiverse(byDiff(pattern[1]), 3, rand, used)
  if (first.length < 3 || second.length < 3) {
    throw new Error('Not enough images to build a balanced 6-trial plan')
  }

  const t1 = shuffle([first[0], second[0]], rand)
  const t2pair = shuffle([first[1], second[1]], rand)
  const t3 = shuffle([first[2], second[2]], rand)
  const t2order: Condition[] =
    groupId === 'sketch_first' ? ['sketch', 'direct'] : ['direct', 'sketch']

  const planned: PlannedTrial[] = [
    { image_id: t1[0].image_id, task_id: t1[0].image_id, phase: 'T1', condition: 'baseline' },
    { image_id: t1[1].image_id, task_id: t1[1].image_id, phase: 'T1', condition: 'baseline' },
    { image_id: t2pair[0].image_id, task_id: t2pair[0].image_id, phase: 'T2', condition: t2order[0] },
    { image_id: t2pair[1].image_id, task_id: t2pair[1].image_id, phase: 'T2', condition: t2order[1] },
    { image_id: t3[0].image_id, task_id: t3[0].image_id, phase: 'T3', condition: 'transfer' },
    { image_id: t3[1].image_id, task_id: t3[1].image_id, phase: 'T3', condition: 'transfer' },
  ]
  const ids = planned.map((item) => item.image_id)
  if (new Set(ids).size !== 6) throw new Error('Image assignment reused an image')
  return planned
}

export function shortPlan(plan: PlannedTrial[]): PlannedTrial[] {
  const t1 = plan.find((item) => item.phase === 'T1')
  const sketch = plan.find((item) => item.condition === 'sketch')
  const direct = plan.find((item) => item.condition === 'direct')
  const t3 = plan.find((item) => item.phase === 'T3')
  return [t1, sketch, direct, t3].filter((item): item is PlannedTrial => Boolean(item))
}

export function nextGroupId(sessions: Session[]): GroupId {
  return sessions.length % 2 === 0 ? 'direct_first' : 'sketch_first'
}

export function nextParticipantId(sessions: Session[]): string {
  const max = sessions.reduce((acc, session) => {
    const match = /^P(\d+)$/i.exec(session.participant_id)
    if (!match) return acc
    return Math.max(acc, Number(match[1]))
  }, 0)
  return `P${String(max + 1).padStart(3, '0')}`
}
