import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateImageFromIntent } from './jimeng'

type FetchCall = {
  status: number
  json?: Record<string, unknown>
  text?: string
  throwNetwork?: boolean
}

function mockFetchSequence(calls: FetchCall[]) {
  const remaining = [...calls]
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const next = remaining.shift()
      if (!next) throw new Error('unexpected extra fetch')
      if (next.throwNetwork) throw new Error('Jimeng request timed out')
      if (next.text != null) {
        return new Response(next.text, {
          status: next.status,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      return new Response(JSON.stringify(next.json ?? {}), {
        status: next.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
  return remaining
}

const fast = { pollDelayMs: 0, retryDelayMs: 0, maxRetries: 5, pollLimit: 6 }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('generateImageFromIntent concurrency retries', () => {
  it('retries a 429 submit and then succeeds', async () => {
    mockFetchSequence([
      { status: 429, json: { error: 'QPS limit exceeded', retryable: true } },
      { status: 200, json: { status: 'submitted', task_id: 'task-1' } },
      { status: 200, json: { status: 'done', data_url: 'data:image/png;base64,aaa' } },
    ])
    const result = await generateImageFromIntent('a cat', undefined, [], fast)
    expect(result.meta.status).toBe('done')
    expect(result.meta.jimeng_task_id).toBe('task-1')
    expect(result.data_url).toMatch(/^data:image/)
  })

  it('keeps polling when a poll is rate-limited or drops a packet', async () => {
    mockFetchSequence([
      { status: 200, json: { status: 'submitted', task_id: 'task-2' } },
      { status: 429, json: { error: 'too many requests', retryable: true } },
      { throwNetwork: true },
      { status: 200, json: { status: 'generating', retryable: true } },
      { status: 200, json: { status: 'done', data_url: 'data:image/jpeg;base64,bbb' } },
    ])
    const result = await generateImageFromIntent('a room', undefined, [], fast)
    expect(result.meta.status).toBe('done')
    expect(result.meta.engine).toBe('jimeng_t2i_v40')
  })

  it('does not retry a genuine missing-prompt error', async () => {
    mockFetchSequence([{ status: 400, json: { error: 'Missing prompt' } }])
    const result = await generateImageFromIntent('', undefined, [], fast)
    expect(result.meta.status).toBe('placeholder')
    expect(result.meta.error).toMatch(/Missing prompt/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns a retryable timeout when fetch never settles', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    const result = await generateImageFromIntent('a cat', undefined, [], {
      pollDelayMs: 0,
      retryDelayMs: 0,
      maxRetries: 1,
      pollLimit: 1,
      fetchTimeoutMs: 25,
      overallTimeoutMs: 80,
    })
    expect(result.meta.status).toBe('placeholder')
    expect(result.meta.error).toMatch(/timed out/i)
  })
})
