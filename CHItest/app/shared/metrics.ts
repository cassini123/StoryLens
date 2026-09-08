import type { PrecisionDim, PrecisionScores } from './types'
import { PRECISION_DIMS } from './types'

export function emptyPrecision(): PrecisionScores {
  return {
    object: null,
    spatial: null,
    relation: null,
    camera: null,
    emotion: null,
    constraint: null,
  }
}

export function precisionComplete(scores: PrecisionScores): boolean {
  return PRECISION_DIMS.every((dim) => scores[dim] != null)
}

export function precisionTotal(scores: PrecisionScores): number | null {
  if (!precisionComplete(scores)) return null
  return PRECISION_DIMS.reduce((sum, dim) => sum + (scores[dim] ?? 0), 0)
}

export function dimensionExpressed(score: number | null, threshold = 2): boolean {
  return score != null && score >= threshold
}

/**
 * Discovery Rate = newly expressed required dimensions / required dimensions missing at T1.
 * Returns null when the denominator is 0.
 */
export function discoveryRate(
  t1: PrecisionScores,
  t2: PrecisionScores,
  required: PrecisionDim[],
): number | null {
  const missingAtT1 = required.filter((dim) => !dimensionExpressed(t1[dim]))
  if (missingAtT1.length === 0) return null
  const newly = missingAtT1.filter((dim) => dimensionExpressed(t2[dim]))
  return newly.length / missingAtT1.length
}

export function newlyDiscoveredDims(
  t1: PrecisionScores,
  t2: PrecisionScores,
  required: PrecisionDim[],
): PrecisionDim[] {
  return required.filter((dim) => !dimensionExpressed(t1[dim]) && dimensionExpressed(t2[dim]))
}

export function learningGain(pT1: number | null, pT2: number | null): number | null {
  if (pT1 == null || pT2 == null) return null
  return pT2 - pT1
}

export function transferGain(pT3: number | null, pT1: number | null): number | null {
  if (pT3 == null || pT1 == null) return null
  return pT3 - pT1
}

export function aiFeedbackGain(p1: number | null, p0: number | null): number | null {
  if (p1 == null || p0 == null) return null
  return p1 - p0
}

export function sketchGain(p2: number | null, p1: number | null): number | null {
  if (p2 == null || p1 == null) return null
  return p2 - p1
}

export function withinTaskDelta(pFinal: number | null, pInitial: number | null): number | null {
  if (pFinal == null || pInitial == null) return null
  return pFinal - pInitial
}

export function mean(values: Array<number | null>): number | null {
  const nums = values.filter((value): value is number => value != null)
  if (nums.length === 0) return null
  return nums.reduce((sum, value) => sum + value, 0) / nums.length
}
