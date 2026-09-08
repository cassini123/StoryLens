import { describe, expect, it } from 'vitest'
import { COPY } from './i18n'

describe('participant prompts', () => {
  it('does not tell people to avoid professional language', () => {
    for (const locale of ['zh', 'en'] as const) {
      const { observe, refine, introduction } = COPY[locale]
      const blob = `${observe} ${refine} ${introduction}`
      expect(blob).not.toMatch(/专业术语/)
      expect(blob).not.toMatch(/do not need technical terms/i)
      expect(blob).not.toMatch(/don't use (professional|technical)/i)
    }
  })

  it('invites a clear description in the participant\'s own words', () => {
    expect(COPY.zh.observe).toMatch(/自己的话/)
    expect(COPY.zh.observe).toMatch(/没有标准答案/)
    expect(COPY.en.observe.toLowerCase()).toMatch(/own words/)
    expect(COPY.en.observe.toLowerCase()).toMatch(/no single correct answer/)
  })
})
