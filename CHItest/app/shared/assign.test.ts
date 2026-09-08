import { describe, expect, it } from 'vitest'
import {
  assignGroup,
  assignImages,
  groupCode,
  groupSequence,
  patternForParticipant,
  PATTERNS,
  PATTERN_COUNTS,
  shortPlan,
} from './assign'
import { images } from './config'
import type { StimulusGroup } from './types'

describe('stratified 7-task assignment', () => {
  it('assigns groups with 1/2 probability and exports 0/1', () => {
    expect(assignGroup(() => 0.49)).toBe('control')
    expect(assignGroup(() => 0.5)).toBe('scaffold')
    expect(groupCode('control')).toBe(0)
    expect(groupCode('scaffold')).toBe(1)
    expect(groupSequence('control')).toBe('T1 T1 T1 T1')
    expect(groupSequence('scaffold')).toBe('T1 T1 T2 T2')
  })

  it('gives scaffold participants T0×1 T1×2 T2×2 T3×2', () => {
    const plan = assignImages(images, 'P001', patternForParticipant('P001'), 'scaffold')
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
    const scaffold = assignImages(images, 'P001', 'A', 'scaffold')
    const control = assignImages(images, 'P002', 'B', 'control')
    expect(scaffold.map((item) => item.stage)).toEqual(['T0', 'T1', 'T1', 'T2', 'T2', 'T3', 'T3'])
    expect(control.map((item) => item.stage)).toEqual(['T0', 'T1', 'T1', 'T1', 'T1', 'T3', 'T3'])
  })

  it('gives control participants T0×1 T1×4 T3×2 and no T2', () => {
    const plan = assignImages(images, 'P002', patternForParticipant('P002'), 'control')
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
      const plan = assignImages(images, id, pattern, 'scaffold')
      const counts: Record<string, number> = {}
      for (const item of plan) {
        const group = images.find((image) => image.image_id === item.image_id)?.group as StimulusGroup
        counts[group] = (counts[group] || 0) + 1
      }
      expect(counts).toEqual(PATTERN_COUNTS[pattern])
    }
  })

  it('is deterministic for a participant id and group', () => {
    expect(assignImages(images, 'P007', 'A', 'scaffold')).toEqual(assignImages(images, 'P007', 'A', 'scaffold'))
    expect(assignImages(images, 'P008', 'B', 'control')).toEqual(assignImages(images, 'P008', 'B', 'control'))
  })

  it('short plan keeps the group’s key stages', () => {
    expect(shortPlan(assignImages(images, 'P001', 'A', 'scaffold')).map((item) => item.stage)).toEqual([
      'T0',
      'T1',
      'T2',
      'T3',
    ])
    expect(shortPlan(assignImages(images, 'P002', 'B', 'control')).map((item) => item.stage)).toEqual([
      'T0',
      'T1',
      'T1',
      'T3',
    ])
    expect(shortPlan(assignImages(images, 'P002', 'B', 'control')).map((item) => item.block)).toEqual([
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
