import { buildParticipantPacket } from './export'
import type { Session } from './types'

const API_PATHS = ['/api/chitest-session/', '/api/chitest-session']

export type UploadKind = 'checkpoint' | 'final'

export type UploadResult = {
  ok: boolean
  id?: string
  backend?: string
  error?: string
  images_included?: boolean
}

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    json = { error: text || `HTTP ${res.status}` }
  }
  return { ok: res.ok, status: res.status, json }
}

export async function uploadParticipantPacket(session: Session, kind: UploadKind): Promise<UploadResult> {
  const includeImages = kind === 'final'
  const packet = await buildParticipantPacket(session, { includeImages })
  const payload = {
    kind,
    participant_id: session.participant_id,
    session_id: session.session_id,
    packet,
  }
  let lastError = 'Upload failed'
  for (const path of API_PATHS) {
    try {
      const result = await postJson(path, payload)
      if (result.ok) {
        return {
          ok: true,
          id: String(result.json.id || ''),
          backend: String(result.json.backend || ''),
          images_included: packet.images_included,
        }
      }
      lastError = String(result.json.error || `HTTP ${result.status}`)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }
  return { ok: false, error: lastError, images_included: packet.images_included }
}

export type SessionListItem = {
  id: string
  backend?: string
  participant_id: string
  session_id: string
  kind: string
  uploaded_at: string
  bytes?: number
  html_url?: string | null
}

export type SessionHealth = {
  status?: string
  storage?: string
  storage_ready?: boolean
  view_token_configured?: boolean
  error?: string
}

async function getJson(path: string): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(path)
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    json = { error: text || `HTTP ${res.status}` }
  }
  return { ok: res.ok, status: res.status, json }
}

function withToken(path: string, token: string, extra = ''): string {
  const params = new URLSearchParams()
  if (token) params.set('token', token)
  params.set('format', 'json')
  return `${path}?${params.toString()}${extra}`
}

export async function fetchSessionHealth(): Promise<SessionHealth> {
  for (const path of API_PATHS) {
    try {
      const result = await getJson(`${path}?health=1`)
      if (result.ok) return result.json as SessionHealth
    } catch {
      /* try next */
    }
  }
  return { storage_ready: false, error: 'Session API unavailable' }
}

export async function fetchServerSessions(token: string): Promise<{ ok: boolean; records: SessionListItem[]; error?: string }> {
  for (const path of API_PATHS) {
    try {
      const result = await getJson(withToken(path, token))
      if (result.ok) {
        return { ok: true, records: (result.json.records as SessionListItem[]) || [] }
      }
      return { ok: false, records: [], error: String(result.json.error || `HTTP ${result.status}`) }
    } catch (error) {
      return { ok: false, records: [], error: error instanceof Error ? error.message : String(error) }
    }
  }
  return { ok: false, records: [], error: 'Session API unavailable' }
}

export async function fetchServerSession(token: string, id: string): Promise<Record<string, unknown> | null> {
  for (const path of API_PATHS) {
    try {
      const result = await getJson(withToken(path, token, `&id=${encodeURIComponent(id)}`))
      if (result.ok) return result.json
    } catch {
      /* try next */
    }
  }
  return null
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
