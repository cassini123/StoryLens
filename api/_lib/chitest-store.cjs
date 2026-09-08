const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const GIST_PREFIX = 'chitest-session:'
const BLOB_PREFIX = 'chitest-sessions/'
const BLOB_API = 'https://blob.vercel-storage.com'
const GITHUB_API = 'https://api.github.com'
const MAX_LIST = 500

function cleanEnv(value) {
  if (value == null) return ''
  return String(value)
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim()
}

function env(names) {
  for (const name of names) {
    const value = cleanEnv(process.env[name])
    if (value) return { name, value }
  }
  return { name: '', value: '' }
}

function githubToken() {
  return env(['CHITEST_GITHUB_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN'])
}

function blobToken() {
  return env(['BLOB_READ_WRITE_TOKEN'])
}

function viewToken() {
  return env(['CHITEST_VIEW_TOKEN'])
}

function isVercel() {
  return Boolean(process.env.VERCEL)
}

function storageKind() {
  const forced = cleanEnv(process.env.CHITEST_STORAGE)
  if (forced === 'fs' || forced === 'gist' || forced === 'blob' || forced === 'none') return forced
  if (!isVercel()) return 'fs'
  if (blobToken().value) return 'blob'
  if (githubToken().value) return 'gist'
  return 'none'
}

function storageStatus() {
  const kind = storageKind()
  const view = viewToken()
  return {
    storage: kind,
    storage_ready: kind !== 'none',
    view_token_configured: Boolean(view.value),
    view_token_source: view.name || null,
    github_token_configured: Boolean(githubToken().value),
    blob_configured: Boolean(blobToken().value),
    expected: ['CHITEST_GITHUB_TOKEN or BLOB_READ_WRITE_TOKEN', 'CHITEST_VIEW_TOKEN'],
  }
}

function viewTokenOk(provided) {
  const expected = viewToken().value
  if (!expected) return !isVercel()
  if (!provided) return false
  const a = Buffer.from(String(provided))
  const b = Buffer.from(String(expected))
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function safePart(value, fallback = 'x') {
  const text = String(value || fallback)
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
  return text || fallback
}

function stamp(iso) {
  return safePart(String(iso || new Date().toISOString()).replace(/[:.]/g, '-'))
}

function fileName(meta) {
  return `${safePart(meta.participant_id)}__${safePart(meta.session_id)}__${safePart(meta.kind)}__${stamp(meta.uploaded_at)}.json`
}

function parseFileName(name) {
  const base = String(name || '').replace(/\.json$/, '')
  const [participant_id, session_id, kind, uploaded_at] = base.split('__')
  return {
    participant_id: participant_id || '',
    session_id: session_id || '',
    kind: kind || '',
    uploaded_at: uploaded_at || '',
  }
}

function gistDescription(meta) {
  return [
    GIST_PREFIX,
    `participant_id=${meta.participant_id}`,
    `session_id=${meta.session_id}`,
    `kind=${meta.kind}`,
    `uploaded_at=${meta.uploaded_at}`,
  ].join(' ')
}

function parseGistDescription(description) {
  const text = String(description || '')
  if (!text.startsWith(GIST_PREFIX)) return null
  const fields = {}
  for (const part of text.slice(GIST_PREFIX.length).trim().split(/\s+/)) {
    const eq = part.indexOf('=')
    if (eq < 1) continue
    fields[part.slice(0, eq)] = part.slice(eq + 1)
  }
  if (!fields.participant_id || !fields.session_id) return null
  return fields
}

function dataDir() {
  if (process.env.CHITEST_DATA_DIR) return process.env.CHITEST_DATA_DIR
  const cwd = process.cwd()
  const nested = path.join(cwd, 'data/participants/received')
  const repo = path.join(cwd, 'CHItest/data/participants/received')
  if (fs.existsSync(path.join(cwd, 'data/participants'))) return nested
  return repo
}

async function githubFetch(url, init = {}) {
  const token = githubToken().value
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'chitest-session-upload',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const err = new Error(json.message || `GitHub HTTP ${res.status}`)
    err.statusCode = res.status
    throw err
  }
  return json
}

async function saveFs(meta, payload) {
  const dir = dataDir()
  fs.mkdirSync(dir, { recursive: true })
  const name = fileName(meta)
  const full = path.join(dir, name)
  fs.writeFileSync(full, JSON.stringify(payload, null, 2), 'utf8')
  return { id: name, backend: 'fs', bytes: Buffer.byteLength(JSON.stringify(payload)) }
}

function listFs() {
  const dir = dataDir()
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const full = path.join(dir, name)
      const stat = fs.statSync(full)
      const parsed = parseFileName(name)
      return {
        id: name,
        backend: 'fs',
        participant_id: parsed.participant_id,
        session_id: parsed.session_id,
        kind: parsed.kind,
        uploaded_at: parsed.uploaded_at || stat.mtime.toISOString(),
        bytes: stat.size,
      }
    })
    .sort((a, b) => String(b.uploaded_at).localeCompare(String(a.uploaded_at)))
}

function getFs(id) {
  const full = path.join(dataDir(), path.basename(id))
  if (!fs.existsSync(full)) return null
  return JSON.parse(fs.readFileSync(full, 'utf8'))
}

async function saveGist(meta, payload) {
  const name = fileName(meta)
  const content = JSON.stringify(payload, null, 2)
  const created = await githubFetch(`${GITHUB_API}/gists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: gistDescription(meta),
      public: false,
      files: { [name]: { content } },
    }),
  })
  return {
    id: created.id,
    backend: 'gist',
    html_url: created.html_url || null,
    bytes: Buffer.byteLength(content),
  }
}

async function listGists() {
  const items = []
  for (let page = 1; page <= 5 && items.length < MAX_LIST; page += 1) {
    const batch = await githubFetch(`${GITHUB_API}/gists?per_page=100&page=${page}`)
    if (!Array.isArray(batch) || batch.length === 0) break
    for (const gist of batch) {
      const fields = parseGistDescription(gist.description)
      if (!fields) continue
      const file = Object.values(gist.files || {})[0] || {}
      items.push({
        id: gist.id,
        backend: 'gist',
        html_url: gist.html_url || null,
        participant_id: fields.participant_id,
        session_id: fields.session_id,
        kind: fields.kind || '',
        uploaded_at: fields.uploaded_at || gist.created_at,
        bytes: file.size || 0,
      })
    }
    if (batch.length < 100) break
  }
  return items.sort((a, b) => String(b.uploaded_at).localeCompare(String(a.uploaded_at)))
}

async function getGist(id) {
  const gist = await githubFetch(`${GITHUB_API}/gists/${encodeURIComponent(id)}`)
  const file = Object.values(gist.files || {})[0]
  if (!file) return null
  if (file.content) {
    try {
      return JSON.parse(file.content)
    } catch {
      return { raw: file.content }
    }
  }
  if (file.raw_url) {
    const res = await fetch(file.raw_url, {
      headers: {
        Authorization: `Bearer ${githubToken().value}`,
        'User-Agent': 'chitest-session-upload',
      },
    })
    return await res.json()
  }
  return null
}

async function saveBlob(meta, payload) {
  const token = blobToken().value
  const pathname = `${BLOB_PREFIX}${fileName(meta)}`
  const body = JSON.stringify(payload)
  const res = await fetch(`${BLOB_API}/${pathname}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-api-version': '7',
      'x-add-random-suffix': '0',
      'Content-Type': 'application/json',
    },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error?.message || json.error || `Blob HTTP ${res.status}`)
    err.statusCode = res.status
    throw err
  }
  return {
    id: pathname,
    backend: 'blob',
    url: json.url || null,
    bytes: Buffer.byteLength(body),
  }
}

async function listBlobs() {
  const token = blobToken().value
  const items = []
  let cursor = ''
  for (let i = 0; i < 10; i += 1) {
    const params = new URLSearchParams({ prefix: BLOB_PREFIX, limit: '100' })
    if (cursor) params.set('cursor', cursor)
    const res = await fetch(`${BLOB_API}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-version': '7',
      },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(json.error?.message || `Blob HTTP ${res.status}`)
      err.statusCode = res.status
      throw err
    }
    for (const blob of json.blobs || []) {
      const name = String(blob.pathname || '').split('/').pop() || ''
      const parsed = parseFileName(name)
      items.push({
        id: blob.pathname,
        backend: 'blob',
        url: blob.url || null,
        participant_id: parsed.participant_id,
        session_id: parsed.session_id,
        kind: parsed.kind,
        uploaded_at: parsed.uploaded_at || blob.uploadedAt || '',
        bytes: blob.size || 0,
      })
    }
    cursor = json.cursor || ''
    if (!cursor) break
  }
  return items.sort((a, b) => String(b.uploaded_at).localeCompare(String(a.uploaded_at)))
}

async function getBlob(id) {
  const token = blobToken().value
  const pathname = String(id).startsWith(BLOB_PREFIX) ? id : `${BLOB_PREFIX}${id}`
  const res = await fetch(`${BLOB_API}/${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-api-version': '7',
    },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const err = new Error(`Blob HTTP ${res.status}`)
    err.statusCode = res.status
    throw err
  }
  return await res.json()
}

async function saveRecord(meta, payload) {
  const kind = storageKind()
  if (kind === 'blob') return saveBlob(meta, payload)
  if (kind === 'gist') return saveGist(meta, payload)
  if (kind === 'fs') return saveFs(meta, payload)
  const err = new Error(
    'No persistent storage. Set CHITEST_GITHUB_TOKEN (gist) or BLOB_READ_WRITE_TOKEN on Vercel Production.',
  )
  err.statusCode = 503
  throw err
}

async function listRecords() {
  const kind = storageKind()
  if (kind === 'blob') return listBlobs()
  if (kind === 'gist') return listGists()
  if (kind === 'fs') return listFs()
  return []
}

async function getRecord(id) {
  const kind = storageKind()
  if (kind === 'blob') return getBlob(id)
  if (kind === 'gist') return getGist(id)
  if (kind === 'fs') return getFs(id)
  return null
}

module.exports = {
  storageKind,
  storageStatus,
  viewTokenOk,
  saveRecord,
  listRecords,
  getRecord,
  gistDescription,
  parseGistDescription,
  fileName,
}
