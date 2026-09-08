import { describe, expect, it } from 'vitest'
import { COPY } from './i18n'

describe('participant prompts', () => {
  it('tells people there is no standard answer and no need for professional terms', () => {
    for (const locale of ['zh', 'en'] as const) {
      const { observeT0, observeAdjust, introduction } = COPY[locale]
      const blob = `${observeT0} ${observeAdjust} ${introduction}`
      expect(blob).toMatch(locale === 'zh' ? /专业术语/ : /professional terms/)
      expect(blob).toMatch(locale === 'zh' ? /没有标准答案/ : /no single correct answer/)
    }
  })

  it('uses T0 as visual readout and T1+ as intended adjustment', () => {
    expect(COPY.zh.observeT0).toMatch(/读到的视觉信息/)
    expect(COPY.zh.observeAdjust).toMatch(/希望如何调整这个画面/)
    expect(COPY.en.observeT0.toLowerCase()).toMatch(/visual information/)
    expect(COPY.en.observeAdjust.toLowerCase()).toMatch(/adjust/)
  })

  it('does not ask people to reproduce the original picture', () => {
    for (const locale of ['zh', 'en'] as const) {
      const blob = `${COPY[locale].observeT0} ${COPY[locale].observeAdjust} ${COPY[locale].refine}`
      expect(blob).not.toMatch(/复现/)
      expect(blob).not.toMatch(/尽可能相似/)
      expect(blob.toLowerCase()).not.toMatch(/reproduce/)
      expect(blob.toLowerCase()).not.toMatch(/as similar as possible/)
    }
  })
})
