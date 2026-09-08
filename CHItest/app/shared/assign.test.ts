import { describe, expect, it } from 'vitest'
import {
  assignImages,
  groupForParticipant,
  patternForParticipant,
  PATTERNS,
  PATTERN_COUNTS,
  shortPlan,
} from './assign'
import { images } from './config'
import type { StimulusGroup } from './types'

describe('stratified 7-task assignment', () => {
  it('assigns odd IDs to scaffold and even IDs to control', () => {
    expect(groupForParticipant('P001')).toBe('scaffold')
    expect(groupForParticipant('P002')).toBe('control')
    expect(groupForParticipant('P003')).toBe('scaffold')
  })

  it('gives scaffold participants T0×1 T1×2 T2×2 T3×2', () => {
    const plan = assignImages(images, 'P001')
    expect(plan).toHaveLength(7)
    expect(new Set(plan.map((item) => item.image_id)).size).toBe(7)
    expect(plan.filter((item) => item.stage === 'T0')).toHaveLength(1)
    expect(plan.filter((item) => item.stage === 'T1')).toHaveLength(2)
    expect(plan.filter((item) => item.stage === 'T2')).toHaveLength(2)
    expect(plan.filter((item) => item.stage === 'T3')).toHaveLength(2)
    expect(plan.map((item) => item.block)).toEqual([
      'baseline',
      'early',
      'early',
      'middle',
      'middle',
      'transfer',
      'transfer',
    ])
  })

  it('keeps executed stages identical to stored condition_order', () => {
    const scaffold = assignImages(images, 'P001')
    const control = assignImages(images, 'P002')
    expect(scaffold.map((item) => item.stage)).toEqual(['T0', 'T1', 'T1', 'T2', 'T2', 'T3', 'T3'])
    expect(control.map((item) => item.stage)).toEqual(['T0', 'T1', 'T1', 'T1', 'T1', 'T3', 'T3'])
  })

  it('gives control participants T0×1 T1×4 T3×2 and no T2', () => {
    const plan = assignImages(images, 'P002')
    expect(plan).toHaveLength(7)
    expect(new Set(plan.map((item) => item.image_id)).size).toBe(7)
    expect(plan.filter((item) => item.stage === 'T0')).toHaveLength(1)
    expect(plan.filter((item) => item.stage === 'T1')).toHaveLength(4)
    expect(plan.filter((item) => item.stage === 'T2')).toHaveLength(0)
    expect(plan.filter((item) => item.stage === 'T3')).toHaveLength(2)
    expect(plan.filter((item) => item.block === 'early')).toHaveLength(2)
    expect(plan.filter((item) => item.block === 'middle')).toHaveLength(2)
  })

  it('rotates composition patterns', () => {
    expect(patternForParticipant('P001')).toBe('A')
    expect(patternForParticipant('P002')).toBe('B')
    expect(patternForParticipant('P003')).toBe('C')
    expect(patternForParticipant('P004')).toBe('A')
  })

  it('matches the documented group counts', () => {
    for (const id of ['P001', 'P002', 'P003']) {
      const pattern = patternForParticipant(id)
      const plan = assignImages(images, id, pattern)
      const counts: Record<string, number> = {}
      for (const item of plan) {
        const group = images.find((image) => image.image_id === item.image_id)?.group as StimulusGroup
        counts[group] = (counts[group] || 0) + 1
      }
      expect(counts).toEqual(PATTERN_COUNTS[pattern])
    }
  })

  it('is deterministic for a participant id', () => {
    expect(assignImages(images, 'P007')).toEqual(assignImages(images, 'P007'))
    expect(assignImages(images, 'P008')).toEqual(assignImages(images, 'P008'))
  })

  it('short plan keeps the group’s key stages', () => {
    expect(shortPlan(assignImages(images, 'P001')).map((item) => item.stage)).toEqual(['T0', 'T1', 'T2', 'T3'])
    expect(shortPlan(assignImages(images, 'P002')).map((item) => item.stage)).toEqual(['T0', 'T1', 'T1', 'T3'])
    expect(shortPlan(assignImages(images, 'P002')).map((item) => item.block)).toEqual([
      'baseline',
      'early',
      'middle',
      'transfer',
    ])
  })

  it('exposes three rotation patterns', () => {
    expect(PATTERNS).toEqual(['A', 'B', 'C'])
  })
})
