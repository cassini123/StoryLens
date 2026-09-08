import { afterEach, describe, expect, it } from 'vitest'
import { isResearcherAuthed, loginResearcher, logoutResearcher, researcherName } from './auth'

afterEach(() => {
  logoutResearcher()
})

describe('researcher login', () => {
  it('accepts the two study accounts', () => {
    expect(loginResearcher('Mickey', '12345678')).toBe(true)
    expect(researcherName()).toBe('Mickey')
    expect(isResearcherAuthed()).toBe(true)
    logoutResearcher()
    expect(loginResearcher('Cassini', '12345678')).toBe(true)
    expect(researcherName()).toBe('Cassini')
  })

  it('rejects a wrong password or unknown account', () => {
    expect(loginResearcher('Mickey', 'wrong')).toBe(false)
    expect(loginResearcher('mickey', '12345678')).toBe(false)
    expect(isResearcherAuthed()).toBe(false)
  })
})
