const KEY = 'chitest.researcher'
let memoryName: string | null = null

export const RESEARCHER_ACCOUNTS: Record<string, string> = {
  Mickey: '12345678',
  Cassini: '12345678',
}

function writeName(name: string | null): void {
  memoryName = name
  try {
    if (name) sessionStorage.setItem(KEY, name)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function loginResearcher(username: string, password: string): boolean {
  const expected = RESEARCHER_ACCOUNTS[username]
  if (!expected || expected !== password) return false
  writeName(username)
  notifyAuth()
  return true
}

export function researcherName(): string | null {
  try {
    const stored = sessionStorage.getItem(KEY)
    if (stored && RESEARCHER_ACCOUNTS[stored]) return stored
  } catch {
    /* ignore */
  }
  if (memoryName && RESEARCHER_ACCOUNTS[memoryName]) return memoryName
  return null
}

export function isResearcherAuthed(): boolean {
  return Boolean(researcherName())
}

export function logoutResearcher(): void {
  writeName(null)
  notifyAuth()
}

export function notifyAuth(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('chitest-auth'))
}
