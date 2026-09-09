import { describe, expect, it } from 'vitest'
import { surpriseThanks } from './surprise'

describe('surprise card', () => {
  it('puts the participant id into the thank-you line', () => {
    expect(surpriseThanks('P00')).toBe('Hi P00, thank you very much for your participation!')
    expect(surpriseThanks('Mickey')).toBe('Hi Mickey, thank you very much for your participation!')
    expect(surpriseThanks('')).toBe('Hi, thank you very much for your participation!')
  })
})
