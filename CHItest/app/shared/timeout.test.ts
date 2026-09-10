import { describe, expect, it, vi } from 'vitest'
import { fetchWithTimeout, sleep, withTimeout } from './timeout'

describe('timeout helpers', () => {
  it('rejects a promise that never settles', async () => {
    await expect(withTimeout(new Promise(() => {}), 20, 'waited too long')).rejects.toThrow('waited too long')
  })

  it('aborts a hung fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    await expect(fetchWithTimeout('/api/jimeng/', { method: 'POST' }, 20)).rejects.toThrow(/timed out/)
    vi.unstubAllGlobals()
  })

  it('wakes sleep when the abort signal fires', async () => {
    const controller = new AbortController()
    const pending = sleep(10_000, controller.signal)
    controller.abort()
    await expect(pending).rejects.toThrow(/timed out/)
  })
})
