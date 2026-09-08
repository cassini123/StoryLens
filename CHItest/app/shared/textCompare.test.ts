import { describe, expect, it } from 'vitest'
import { copyRatio, eventCopyRatio, levenshtein, pastedFromAuto, textSimilarity, userPromptCompare } from './textCompare'

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

  it('records Auto Prompt to user prompt edit metrics without overwriting either text', () => {
    const row = userPromptCompare({
      autoPrompt: '人物 A 在后方',
      previous: '把人往后放',
      current: '人物 A 在后方，并拉开距离',
      copiedSegments: ['人物 A 在后方'],
      sourceAutoPromptId: 'ap_1',
    })
    expect(row.previous_user_prompt).toBe('把人往后放')
    expect(row.current_user_prompt).toBe('人物 A 在后方，并拉开距离')
    expect(row.source_auto_prompt_id).toBe('ap_1')
    expect(row.edit_distance).toBeGreaterThan(0)
    expect(row.copy_ratio).toBeGreaterThan(0)
    expect(row.copied_segments).toEqual(['人物 A 在后方'])
  })
})
