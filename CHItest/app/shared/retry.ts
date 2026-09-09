/** Transient HTTP / Jimeng failures that should be retried instead of showing a placeholder. */

export const RETRYABLE_HTTP_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504])

export const RETRYABLE_JIMENG_CODES = new Set([
  50200, 50411, 50413, 50429, 50430, 50500,
])

const RETRYABLE_MESSAGE =
  /timed out|timeout|econnreset|econnrefused|enotfound|epipe|etimedout|socket hang up|network|429|502|503|504|qps|rate.?limit|too many|concurren|throttl|overload|busy|限流|繁忙|并发/i

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status)
}

export function isRetryableJimengCode(code: unknown): boolean {
  const numeric = Number(code)
  return Number.isFinite(numeric) && RETRYABLE_JIMENG_CODES.has(numeric)
}

export function isRetryableMessage(message: string): boolean {
  return Boolean(message) && RETRYABLE_MESSAGE.test(message)
}

export function backoffMs(attempt: number, base = 500, cap = 8000): number {
  const exp = Math.min(cap, base * 2 ** Math.max(0, attempt))
  return exp + Math.floor(Math.random() * Math.min(400, Math.ceil(exp * 0.25)))
}

export function publicJimengError(reason: string): 'busy' | 'failed' {
  return isRetryableHttpStatus(Number(reason.replace(/\D/g, '')) || 0) || isRetryableMessage(reason)
    ? 'busy'
    : 'failed'
}
