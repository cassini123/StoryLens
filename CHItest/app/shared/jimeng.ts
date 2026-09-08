import type { GeneratedImageMeta } from './types'

const API_PATHS = ['/api/jimeng/', '/api/jimeng']

export type JimengHealth = {
  status?: string
  engine?: string
  credentials: boolean
  has_access_key?: boolean
  has_secret_key?: boolean
  error?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function placeholder(prompt: string, reason: string): { data_url: string; meta: GeneratedImageMeta } {
  const safe = reason.replace(/[<>]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111"/>
  <text x="480" y="240" fill="#fff" font-size="22" text-anchor="middle">Generated image unavailable</text>
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
    throw new Error(`Jimeng API returned ${res.status} (not JSON). Try /api/jimeng/`)
  }
}

async function postJimeng(payload: Record<string, unknown>): Promise<{
  ok: boolean
  status: number
  json: Record<string, unknown>
}> {
  let lastError: Error | null = null
  for (const path of API_PATHS) {
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      })
      const json = await readJson(res)
      return { ok: res.ok, status: res.status, json }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
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

export async function generateImageFromIntent(
  prompt: string,
  onStatus?: (status: string) => void,
  images: string[] = [],
): Promise<{ data_url: string; meta: GeneratedImageMeta }> {
  onStatus?.('submitting')
  try {
    const submit = await postJimeng({
      action: 'submit',
      prompt,
      width: 1664,
      height: 936,
      images,
    })
    const submitted = submit.json
    if (!submit.ok || submitted.error) {
      return placeholder(prompt, String(submitted.error || `HTTP ${submit.status}`))
    }
    const taskId = String(submitted.task_id || '')
    if (!taskId) {
      return placeholder(prompt, 'Jimeng submit did not return a task_id')
    }
    for (let i = 0; i < 40; i += 1) {
      onStatus?.(`polling ${i + 1}`)
      await sleep(3000)
      const poll = await postJimeng({ action: 'poll', task_id: taskId })
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
      if (result.status === 'failed' || result.status === 'error') {
        return placeholder(prompt, String(result.error || 'Jimeng generation failed'))
      }
    }
    return placeholder(prompt, 'Generation timed out')
  } catch (error) {
    return placeholder(prompt, error instanceof Error ? error.message : String(error))
  }
}
