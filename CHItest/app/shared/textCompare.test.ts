import { describe, expect, it } from 'vitest'
import { copyRatio, eventCopyRatio, levenshtein, pastedFromAuto, textSimilarity } from './textCompare'

describe('textCompare', () => {
  it('measures edit distance and similarity', () => {
    expect(levenshtein('abc', 'abc')).toBe(0)
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(textSimilarity('abc', 'abc')).toBe(1)
  })

  it('computes copy ratio from auto prompt into user prompt', () => {
    expect(copyRatio('将人物A放到B后方', '将人物A放到B后方，并拉开距离')).toBeGreaterThan(0.5)
    expect(pastedFromAuto('将右侧人物移动到斜后方。', '将右侧人物移动到斜后方。')).toBe(true)
    expect(pastedFromAuto('将右侧人物移动到斜后方。', '换一个完全不同的说法')).toBe(false)
  })

  it('computes copy_ratio from directly pasted characters', () => {
    const copied = '将人物A放到B后方'
    const dest = `${copied}，并拉开距离`
    expect(eventCopyRatio([copied], dest)).toBeCloseTo(copied.length / dest.length)
    expect(eventCopyRatio([], '完全重写')).toBe(0)
  })
})
