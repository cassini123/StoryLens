import type { GeneratedImageMeta } from './types'
import {
  backoffMs,
  isRetryableHttpStatus,
  isRetryableJimengCode,
  isRetryableMessage,
} from './retry'

const API_PATHS = ['/api/jimeng/', '/api/jimeng']

export type JimengHealth = {
  status?: string
  engine?: string
  credentials: boolean
  has_access_key?: boolean
  has_secret_key?: boolean
  error?: string
}

export type JimengClientOptions = {
  pollDelayMs?: number
  pollLimit?: number
  retryDelayMs?: number
  maxRetries?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function placeholder(prompt: string, reason: string): { data_url: string; meta: GeneratedImageMeta } {
  const safe = reason.replace(/[<>]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111"/>
  <text x="480" y="240" fill="#fff" font-size="22" text-anchor="middle">生成失败，请再试一次</text>
  <text x="480" y="280" fill="#bbb" font-size="14" text-anchor="middle">${safe.slice(0, 80)}</text>
</svg>`
  return {
    data_url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    meta: {
      engine: 'placeholder',
      prompt,
      timestamp: new Date().toISOString(),
      jimeng_task_id: '',
      status: 'placeholder',
      error: reason,
    },
  }
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    const snippet = text.replace(/\s+/g, ' ').slice(0, 180)
    throw new Error(`Jimeng API returned ${res.status} (not JSON): ${snippet}`)
  }
}

function payloadRetryable(json: Record<string, unknown>, status: number): boolean {
  if (json.retryable === true) return true
  if (isRetryableHttpStatus(status)) return true
  if (isRetryableJimengCode(json.code)) return true
  const error = String(json.error || json.message || '')
  return isRetryableMessage(error)
}

async function waitRetry(attempt: number, options: JimengClientOptions): Promise<void> {
  if (typeof options.retryDelayMs === 'number') {
    if (options.retryDelayMs > 0) await sleep(options.retryDelayMs)
    return
  }
  await sleep(backoffMs(attempt))
}

async function postJimeng(
  payload: Record<string, unknown>,
  options: JimengClientOptions = {},
): Promise<{
  ok: boolean
  status: number
  json: Record<string, unknown>
}> {
  const maxRetries = options.maxRetries ?? 5
  let lastError: Error | null = null
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    let retryThisAttempt = false
    for (const path of API_PATHS) {
      try {
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        })
        const json = await readJson(res)
        if (res.ok) return { ok: true, status: res.status, json }
        if (payloadRetryable(json, res.status) && attempt < maxRetries - 1) {
          lastError = new Error(String(json.error || `HTTP ${res.status}`))
          retryThisAttempt = true
          break
        }
        return { ok: false, status: res.status, json }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (isRetryableMessage(lastError.message) && attempt < maxRetries - 1) {
          retryThisAttempt = true
          break
        }
      }
    }
    if (!retryThisAttempt) {
      throw lastError || new Error('Jimeng API unreachable')
    }
    await waitRetry(attempt, options)
  }
  throw lastError || new Error('Jimeng API unreachable')
}

export async function checkJimengHealth(): Promise<JimengHealth> {
  for (const path of API_PATHS) {
    try {
      const res = await fetch(path, { method: 'GET', redirect: 'follow' })
      const json = await readJson(res)
      return {
        status: String(json.status || ''),
        engine: String(json.engine || ''),
        credentials: Boolean(json.credentials),
        has_access_key: Boolean(json.has_access_key),
        has_secret_key: Boolean(json.has_secret_key),
        error: typeof json.error === 'string' ? json.error : undefined,
      }
    } catch {
      continue
    }
  }
  return { credentials: false, error: 'Jimeng API unreachable' }
}

function pollIsHardFailure(json: Record<string, unknown>): boolean {
  const status = String(json.status || '')
  if (status !== 'failed' && status !== 'error') return false
  if (json.retryable === true) return false
  return !isRetryableMessage(String(json.error || json.message || ''))
}

export async function generateImageFromIntent(
  prompt: string,
  onStatus?: (status: string) => void,
  images: string[] = [],
  options: JimengClientOptions = {},
): Promise<{ data_url: string; meta: GeneratedImageMeta }> {
  const pollDelay = options.pollDelayMs ?? 3000
  const pollLimit = options.pollLimit ?? 50
  onStatus?.('submitting')
  try {
    const submit = await postJimeng(
      {
        action: 'submit',
        prompt,
        width: 1664,
        height: 936,
        images,
      },
      options,
    )
    const submitted = submit.json
    if (!submit.ok || submitted.error) {
      return placeholder(prompt, String(submitted.error || `HTTP ${submit.status}`))
    }
    const taskId = String(submitted.task_id || '')
    if (!taskId) {
      return placeholder(prompt, 'Jimeng submit did not return a task_id')
    }
    for (let i = 0; i < pollLimit; i += 1) {
      onStatus?.(`polling ${i + 1}`)
      const jitter = pollDelay === 0 ? 0 : Math.floor(Math.random() * 1200)
      await sleep(pollDelay + jitter)
      let poll: { ok: boolean; status: number; json: Record<string, unknown> }
      try {
        poll = await postJimeng({ action: 'poll', task_id: taskId }, options)
      } catch (error) {
        if (i === pollLimit - 1) {
          return placeholder(prompt, error instanceof Error ? error.message : String(error))
        }
        continue
      }
      const result = poll.json
      if (result.status === 'done' && typeof result.data_url === 'string') {
        return {
          data_url: result.data_url,
          meta: {
            engine: 'jimeng_t2i_v40',
            prompt,
            timestamp: new Date().toISOString(),
            jimeng_task_id: taskId,
            status: 'done',
            error: '',
          },
        }
      }
      if (pollIsHardFailure(result)) {
        return placeholder(prompt, String(result.error || 'Jimeng generation failed'))
      }
    }
    return placeholder(prompt, 'Generation timed out')
  } catch (error) {
    return placeholder(prompt, error instanceof Error ? error.message : String(error))
  }
}
