import { describe, expect, it } from 'vitest'
import { layoutCaptionBox, thanksMessage, wrapCaption } from './thanksCard'

const unit = (value: string) => value.length

describe('thanksMessage', () => {
  it('only substitutes the participant id into fixed copy', () => {
    expect(thanksMessage('P017', 'en')).toBe('Hi P017, thank you very much for your participation!')
    expect(thanksMessage('P017', 'zh')).toBe('Hi P017，很荣幸邀请您参与我们的实验，非常感谢！')
  })

  it('keeps a fallback id when blank', () => {
    expect(thanksMessage('  ', 'en')).toMatch(/^Hi P000,/)
  })
})

describe('wrapCaption', () => {
  it('stays on one line when the black box is wide enough', () => {
    expect(wrapCaption('Hi P001, thanks', 80, unit)).toEqual(['Hi P001, thanks'])
  })

  it('wraps to at most two lines for a long Chinese sentence', () => {
    const text = thanksMessage('P001', 'zh')
    const lines = wrapCaption(text, 18, unit)
    expect(lines.length).toBeLessThanOrEqual(2)
    expect(lines.join('').length).toBeGreaterThan(10)
  })
})

describe('layoutCaptionBox', () => {
  it('centers a black box that fits the text length', () => {
    const short = layoutCaptionBox('Hi P1', 1000, 800, unit)
    const long = layoutCaptionBox(thanksMessage('P012', 'en'), 1000, 800, unit)
    expect(short.width).toBeLessThan(long.width)
    expect(long.width).toBeLessThanOrEqual(1000 * (1 - 0.07 * 2))
    expect(Math.abs(short.x + short.width / 2 - 500)).toBeLessThan(1)
  })
})
