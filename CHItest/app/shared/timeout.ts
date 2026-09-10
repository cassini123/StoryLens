export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  if (!(ms > 0)) return promise
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Jimeng request timed out'))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('Jimeng request timed out'))
    }
    signal?.addEventListener('abort', onAbort)
  })
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 25_000,
): Promise<Response> {
  const parent = init.signal
  if (parent?.aborted) throw new Error('Jimeng request timed out')
  const controller = new AbortController()
  const onParentAbort = () => controller.abort()
  parent?.addEventListener('abort', onParentAbort)
  const request = fetch(input, { ...init, signal: controller.signal }).catch((error: unknown) => {
    if (parent?.aborted || controller.signal.aborted) {
      throw new Error('Jimeng request timed out')
    }
    throw error
  })
  try {
    return await withTimeout(request, timeoutMs, 'Jimeng request timed out')
  } catch (error) {
    controller.abort()
    throw error
  } finally {
    parent?.removeEventListener('abort', onParentAbort)
  }
}
