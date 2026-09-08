import { STAGES, type Session, type Stage } from './types'

export type SlotState = 'done' | 'current' | 'todo'

export interface StageProgress {
  stage: Stage
  total: number
  done: number
  current: boolean
  fillPercent: number
  slots: SlotState[]
}

export interface SessionProgress {
  percent: number
  completedTasks: number
  totalTasks: number
  stages: StageProgress[]
  label: string
}

const DEFAULT_COUNTS: Record<Stage, number> = { T0: 1, T1: 2, T2: 2, T3: 2 }

function inTaskStep(step: string): boolean {
  return step === 'describe' || step === 'sketch_edit' || step === 'generating' || step === 'review'
}

export function sessionProgress(session: Session | null): SessionProgress {
  if (!session) {
    return {
      percent: 0,
      completedTasks: 0,
      totalTasks: 7,
      stages: STAGES.map((stage) => ({
        stage,
        total: DEFAULT_COUNTS[stage],
        done: 0,
        current: false,
        fillPercent: 0,
        slots: Array.from({ length: DEFAULT_COUNTS[stage] }, () => 'todo' as const),
      })),
      label: '未开始',
    }
  }

  const totalTasks = Math.max(1, session.tasks.length)
  const completedTasks = session.tasks.filter((item) => Boolean(item.ended_at)).length
  const step = session.runtime.step
  const active = inTaskStep(step) ? session.tasks[session.runtime.task_index] : undefined

  const stages: StageProgress[] = STAGES.map((stage) => {
    const items = session.tasks.filter((item) => item.stage === stage)
    const total = items.length || DEFAULT_COUNTS[stage]
    const slots: SlotState[] = (items.length ? items : Array.from({ length: total }, () => null)).map((item) => {
      if (item?.ended_at) return 'done'
      if (item && active && item.task_id === active.task_id) return 'current'
      return 'todo'
    })
    const done = slots.filter((slot) => slot === 'done').length
    const current = slots.some((slot) => slot === 'current')
    const currentBoost = current ? 0.45 : 0
    return {
      stage,
      total,
      done,
      current,
      fillPercent: Math.min(100, Math.round(((done + currentBoost) / total) * 100)),
      slots,
    }
  })

  if (step === 'intro' || step === 'setup') {
    return { percent: 0, completedTasks, totalTasks, stages, label: '介绍' }
  }
  if (step === 'complete') {
    const finished = stages.map((stage) => ({
      ...stage,
      done: stage.total,
      current: false,
      fillPercent: 100,
      slots: stage.slots.map(() => 'done' as const),
    }))
    return { percent: 100, completedTasks: totalTasks, totalTasks, stages: finished, label: '完成' }
  }
  if (step === 'questionnaire') {
    const filled = stages.map((stage) => ({
      ...stage,
      done: stage.total,
      current: false,
      fillPercent: 100,
      slots: stage.slots.map(() => 'done' as const),
    }))
    return { percent: 96, completedTasks: totalTasks, totalTasks, stages: filled, label: '问卷' }
  }

  const roundFrac = active
    ? active.stage === 'T0'
      ? session.runtime.draft_text.trim()
        ? 0.5
        : 0.2
      : Math.min(0.85, 0.15 + (session.runtime.round / 3) * 0.7)
    : 0
  const percent = Math.min(95, Math.max(1, Math.round(((completedTasks + roundFrac) / totalTasks) * 100)))
  const label = active
    ? `${active.stage} ${completedTasks + 1}/${totalTasks}`
    : `${completedTasks}/${totalTasks}`
  return { percent, completedTasks, totalTasks, stages, label }
}
