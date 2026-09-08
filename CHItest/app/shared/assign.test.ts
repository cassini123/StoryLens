import { describe, expect, it } from 'vitest'
import { assignImages, nextGroupId, shortPlan } from './assign'
import { images } from './config'
import type { Session } from './types'

describe('image assignment', () => {
  it('gives each participant 6 unique images with matched difficulties', () => {
    const plan = assignImages(images, 'P001', 'direct_first')
    expect(plan).toHaveLength(6)
    expect(new Set(plan.map((item) => item.image_id)).size).toBe(6)
    expect(plan.filter((item) => item.phase === 'T1')).toHaveLength(2)
    expect(plan.filter((item) => item.condition === 'direct')).toHaveLength(1)
    expect(plan.filter((item) => item.condition === 'sketch')).toHaveLength(1)
    expect(plan.filter((item) => item.phase === 'T3')).toHaveLength(2)
  })

  it('counterbalances T2 order', () => {
    const directFirst = assignImages(images, 'P001', 'direct_first')
    const sketchFirst = assignImages(images, 'P001', 'sketch_first')
    const t2Direct = directFirst.filter((item) => item.phase === 'T2')
    const t2Sketch = sketchFirst.filter((item) => item.phase === 'T2')
    expect(t2Direct.map((item) => item.condition)).toEqual(['direct', 'sketch'])
    expect(t2Sketch.map((item) => item.condition)).toEqual(['sketch', 'direct'])
  })

  it('is deterministic for a participant id', () => {
    expect(assignImages(images, 'P007', 'direct_first')).toEqual(
      assignImages(images, 'P007', 'direct_first'),
    )
  })

  it('covers more than one task type', () => {
    const plan = assignImages(images, 'P012', 'direct_first')
    const types = new Set(plan.map((item) => images.find((image) => image.image_id === item.image_id)?.task_type))
    expect(types.size).toBeGreaterThan(2)
  })

  it('short plan keeps one of each key condition', () => {
    const plan = shortPlan(assignImages(images, 'P002', 'direct_first'))
    expect(plan.some((item) => item.condition === 'sketch')).toBe(true)
    expect(plan.some((item) => item.phase === 'T3')).toBe(true)
  })

  it('rotates group assignment', () => {
    const sessions = [{}, {}] as Session[]
    expect(nextGroupId(sessions)).toBe('direct_first')
    expect(nextGroupId([{}] as Session[])).toBe('sketch_first')
  })
})
