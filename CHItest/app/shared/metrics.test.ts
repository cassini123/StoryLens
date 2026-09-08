import { describe, expect, it } from 'vitest'
import {
  discoveryRate,
  emptyPrecision,
  learningGain,
  practiceControlContrast,
  precisionNorm,
  precisionTotal,
  transferContrast,
  transferGain,
} from './metrics'

describe('G1 precision total', () => {
  it('sums six 0–3 dimensions to 0–18', () => {
    expect(
      precisionTotal({
        object: 3,
        spatial: 3,
        relation: 2,
        camera: 1,
        emotion: 0,
        constraint: 2,
      }),
    ).toBe(11)
  })

  it('returns null until all dimensions are coded', () => {
    expect(precisionTotal(emptyPrecision())).toBeNull()
  })

  it('sums only the image’s active dimensions', () => {
    expect(
      precisionTotal(
        { object: 3, spatial: 2, relation: 1, camera: null, emotion: null, constraint: null },
        ['object', 'spatial', 'relation'],
      ),
    ).toBe(6)
  })

  it('normalizes by 3 × active criteria', () => {
    expect(precisionNorm(6, 3)).toBe(6 / 9)
    expect(precisionNorm(null, 3)).toBeNull()
  })
})

describe('G3 discovery rate', () => {
  it('counts newly expressed required dimensions', () => {
    const t1 = { object: 3, spatial: 2, relation: 0, camera: 0, emotion: 0, constraint: 0 }
    const t2 = { object: 3, spatial: 3, relation: 2, camera: 2, emotion: 0, constraint: 0 }
    expect(discoveryRate(t1, t2, ['object', 'spatial', 'relation', 'camera'])).toBe(1)
  })

  it('returns null when nothing was missing at T1', () => {
    const full = { object: 3, spatial: 3, relation: 2, camera: 2, emotion: 2, constraint: 2 }
    expect(discoveryRate(full, full, ['object', 'spatial'])).toBeNull()
  })
})

describe('gains', () => {
  it('computes AI, sketch, and transfer gains', () => {
    expect(learningGain(6, 11)).toBe(5)
    expect(transferGain(9, 6)).toBe(3)
    expect(learningGain(null, 11)).toBeNull()
    expect(practiceControlContrast(0.4, 0.1)).toBeCloseTo(0.3)
    expect(transferContrast(0.7, 0.5)).toBeCloseTo(0.2)
  })
})
