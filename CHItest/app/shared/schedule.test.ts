import { describe, expect, it } from 'vitest'
import { buildTrialPlan, nextGroupId } from './schedule'
import type { Session } from './types'

describe('counterbalancing', () => {
  it('assigns Group A direct-first as T01/T03/T05/T07 then T02/T04/T06/T08', () => {
    const plan = buildTrialPlan('A_direct_first')
    expect(plan.map((item) => `${item.condition}:${item.task_id}`)).toEqual([
      'direct:T01',
      'direct:T03',
      'direct:T05',
      'direct:T07',
      'sketch:T02',
      'sketch:T04',
      'sketch:T06',
      'sketch:T08',
    ])
  })

  it('swaps task sets for Group B and condition order for sketch-first', () => {
    const plan = buildTrialPlan('B_sketch_first')
    expect(plan[0]).toEqual({ task_id: 'T01', condition: 'sketch' })
    expect(plan[4]).toEqual({ task_id: 'T02', condition: 'direct' })
    expect(plan).toHaveLength(8)
  })

  it('rotates group assignment', () => {
    const sessions = [{}, {}, {}] as Session[]
    expect(nextGroupId(sessions)).toBe('B_sketch_first')
  })
})
