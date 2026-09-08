import type { GeneratedImageMeta } from './types'

const API = '/api/jimeng'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function placeholder(prompt: string, reason: string): { data_url: string; meta: GeneratedImageMeta } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111"/>
  <text x="480" y="240" fill="#fff" font-size="22" text-anchor="middle">Generated image unavailable</text>
  <text x="480" y="280" fill="#bbb" font-size="14" text-anchor="middle">${reason.slice(0, 80)}</text>
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

export async function generateImageFromIntent(
  prompt: string,
  onStatus?: (status: string) => void,
): Promise<{ data_url: string; meta: GeneratedImageMeta }> {
  onStatus?.('submitting')
  try {
    const submit = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', prompt, width: 1664, height: 936 }),
    })
    const submitted = await submit.json()
    if (!submit.ok || submitted.error) {
      return placeholder(prompt, submitted.error || `HTTP ${submit.status}`)
    }
    const taskId = submitted.task_id as string
    for (let i = 0; i < 40; i += 1) {
      onStatus?.(`polling ${i + 1}`)
      await sleep(3000)
      const poll = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'poll', task_id: taskId }),
      })
      const result = await poll.json()
      if (result.status === 'done' && result.data_url) {
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
        return placeholder(prompt, result.error || 'Jimeng generation failed')
      }
    }
    return placeholder(prompt, 'Generation timed out')
  } catch (error) {
    return placeholder(prompt, error instanceof Error ? error.message : String(error))
  }
}
