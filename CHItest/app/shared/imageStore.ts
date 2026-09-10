import { withTimeout } from './timeout'

const DB_NAME = 'chitest.images.v1'
const STORE = 'images'
const IDB_TIMEOUT_MS = 4000
const memory = new Map<string, string>()

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
}

export async function saveGeneratedImage(trialId: string, dataUrl: string): Promise<void> {
  memory.set(trialId, dataUrl)
  let db: IDBDatabase | undefined
  try {
    db = await withTimeout(openDb(), IDB_TIMEOUT_MS, 'IndexedDB open timed out')
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const tx = db!.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(dataUrl, trialId)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'))
      }),
      IDB_TIMEOUT_MS,
      'IndexedDB write timed out',
    )
  } catch {
    /* Keep the in-memory copy so this page can still show the image. */
  } finally {
    db?.close()
  }
}

export async function getGeneratedImage(trialId: string): Promise<string | null> {
  const cached = memory.get(trialId)
  if (cached) return cached
  let db: IDBDatabase | undefined
  try {
    db = await withTimeout(openDb(), IDB_TIMEOUT_MS, 'IndexedDB open timed out')
    const value = await withTimeout(
      new Promise<string | null>((resolve, reject) => {
        const tx = db!.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(trialId)
        req.onsuccess = () => resolve((req.result as string) ?? null)
        req.onerror = () => reject(req.error)
      }),
      IDB_TIMEOUT_MS,
      'IndexedDB read timed out',
    )
    if (value) memory.set(trialId, value)
    return value
  } catch {
    return null
  } finally {
    db?.close()
  }
}

export async function getGeneratedImages(trialIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const id of trialIds) {
    const value = await getGeneratedImage(id)
    if (value) out[id] = value
  }
  return out
}

export async function deleteGeneratedImages(trialIds: string[]): Promise<void> {
  for (const id of trialIds) memory.delete(id)
  let db: IDBDatabase | undefined
  try {
    db = await withTimeout(openDb(), IDB_TIMEOUT_MS, 'IndexedDB open timed out')
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const tx = db!.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        for (const id of trialIds) store.delete(id)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
      IDB_TIMEOUT_MS,
      'IndexedDB delete timed out',
    )
  } catch {
    /* memory already cleared */
  } finally {
    db?.close()
  }
}

export async function clearGeneratedImages(): Promise<void> {
  memory.clear()
  let db: IDBDatabase | undefined
  try {
    db = await withTimeout(openDb(), IDB_TIMEOUT_MS, 'IndexedDB open timed out')
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const tx = db!.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
      IDB_TIMEOUT_MS,
      'IndexedDB clear timed out',
    )
  } catch {
    /* memory already cleared */
  } finally {
    db?.close()
  }
}
