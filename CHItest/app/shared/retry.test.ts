import { describe, expect, it } from 'vitest'
import {
  backoffMs,
  isRetryableHttpStatus,
  isRetryableJimengCode,
  isRetryableMessage,
  publicJimengError,
} from './retry'

describe('jimeng retry helpers', () => {
  it('retries rate limits, timeouts, and gateway errors', () => {
    expect(isRetryableHttpStatus(429)).toBe(true)
    expect(isRetryableHttpStatus(503)).toBe(true)
    expect(isRetryableHttpStatus(400)).toBe(false)
    expect(isRetryableJimengCode(50411)).toBe(true)
    expect(isRetryableJimengCode(10000)).toBe(false)
    expect(isRetryableMessage('Jimeng request timed out')).toBe(true)
    expect(isRetryableMessage('QPS limit exceeded')).toBe(true)
    expect(isRetryableMessage('Missing prompt')).toBe(false)
  })

  it('maps busy failures for participant-facing copy', () => {
    expect(publicJimengError('HTTP 429')).toBe('busy')
    expect(publicJimengError('Jimeng request timed out')).toBe('busy')
    expect(publicJimengError('No image in Jimeng result')).toBe('failed')
  })

  it('caps exponential backoff', () => {
    const first = backoffMs(0, 500, 8000)
    const later = backoffMs(8, 500, 8000)
    expect(first).toBeGreaterThanOrEqual(500)
    expect(first).toBeLessThan(1000)
    expect(later).toBeLessThanOrEqual(8400)
  })
})
