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

  it('asks people to write what they see for the AI to regenerate', () => {
    expect(COPY.zh.observe).toBe('请先看这张图，尽可能清楚地写下你看到的内容，希望 AI 重新生成的画面。')
    expect(COPY.en.observe.toLowerCase()).toMatch(/what you see/)
    expect(COPY.en.observe.toLowerCase()).toMatch(/regenerate/)
  })
})
