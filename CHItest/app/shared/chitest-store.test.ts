import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const store = require('../../../api/_lib/chitest-store.cjs') as {
  parseGistDescription: (description: string) => Record<string, string> | null
  gistDescription: (meta: Record<string, string>) => string
  saveRecord: (meta: Record<string, string>, payload: unknown) => Promise<{ id: string; backend: string }>
  getRecord: (id: string) => Promise<unknown>
  listRecords: () => Promise<Array<{ id: string; participant_id: string; kind: string }>>
}

const previousStorage = process.env.CHITEST_STORAGE
const previousDir = process.env.CHITEST_DATA_DIR

afterEach(() => {
  if (previousStorage == null) delete process.env.CHITEST_STORAGE
  else process.env.CHITEST_STORAGE = previousStorage
  if (previousDir == null) delete process.env.CHITEST_DATA_DIR
  else process.env.CHITEST_DATA_DIR = previousDir
})

describe('chitest session store', () => {
  it('round-trips gist metadata in the description prefix', () => {
    const description = store.gistDescription({
      participant_id: 'P001',
      session_id: 'S001',
      kind: 'final',
      uploaded_at: '2026-09-08T21:00:00.000Z',
    })
    expect(description.startsWith('chitest-session:')).toBe(true)
    expect(store.parseGistDescription(description)).toEqual({
      participant_id: 'P001',
      session_id: 'S001',
      kind: 'final',
      uploaded_at: '2026-09-08T21:00:00.000Z',
    })
  })

  it('writes and reads a participant json file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'chitest-session-'))
    process.env.CHITEST_STORAGE = 'fs'
    process.env.CHITEST_DATA_DIR = dir
    const payload = {
      kind: 'final',
      participant_id: 'P007',
      session_id: 'S007',
      packet: { participant_id: 'P007', text_versions: [{ text: 'hello' }] },
    }
    const saved = await store.saveRecord(
      {
        participant_id: 'P007',
        session_id: 'S007',
        kind: 'final',
        uploaded_at: '2026-09-08T21:00:00.000Z',
      },
      payload,
    )
    expect(saved.backend).toBe('fs')
    const listed = await store.listRecords()
    expect(listed.some((item) => item.participant_id === 'P007' && item.kind === 'final')).toBe(true)
    const loaded = (await store.getRecord(saved.id)) as typeof payload
    expect(loaded.packet.text_versions[0].text).toBe('hello')
    expect(JSON.parse(readFileSync(join(dir, saved.id), 'utf8')).participant_id).toBe('P007')
  })
})
