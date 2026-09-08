import { useEffect, useState } from 'react'
import {
  downloadEventLogCsv,
  downloadExpertRatingsCsv,
  downloadFullJson,
  downloadGenerationsCsv,
  downloadIntentCsv,
  downloadAutoPromptsCsv,
  downloadParticipantCsv,
  downloadParticipantPacket,
  downloadSketchInteractionsCsv,
  downloadSketchSnapshotsJson,
  downloadTaskCsv,
  downloadTimelinesJson,
} from '../shared/export'
import { clearAllData, loadStore } from '../shared/store'
import { useI18n } from '../shared/i18n'
import {
  downloadJsonFile,
  fetchServerSession,
  fetchServerSessions,
  fetchSessionHealth,
  type SessionHealth,
  type SessionListItem,
} from '../shared/upload'
import { Button, Field, FooterBar, Shell } from '../shared/ui'

const TOKEN_KEY = 'chitest.viewToken'

export function ExportApp() {
  const { t } = useI18n()
  const store = loadStore()
  const taskCount = store.sessions.reduce((n, session) => n + session.tasks.length, 0)
  const eventCount = store.sessions.reduce((n, session) => n + session.event_log.length, 0)
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || ''
    } catch {
      return ''
    }
  })
  const [health, setHealth] = useState<SessionHealth | null>(null)
  const [records, setRecords] = useState<SessionListItem[]>([])
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void fetchSessionHealth().then(setHealth)
  }, [])

  async function loadServer() {
    setLoading(true)
    setServerError('')
    try {
      sessionStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* ignore */
    }
    const result = await fetchServerSessions(token)
    setLoading(false)
    if (!result.ok) {
      setRecords([])
      setServerError(result.error || t.noServerData)
      return
    }
    setRecords(result.records)
  }

  async function downloadRemote(item: SessionListItem) {
    const data = await fetchServerSession(token, item.id)
    if (!data) {
      setServerError(t.noServerData)
      return
    }
    downloadJsonFile(`${item.participant_id}-${item.kind}.json`, data)
  }

  return (
    <Shell title="Export" subtitle="JSON / CSV">
      <main className="page">
        <p className="lead">
          {store.sessions.length} sessions · {taskCount} tasks · {eventCount} events · {store.ratings.length}{' '}
          expert ratings · {store.codings.length} researcher codes
        </p>
        <p>
          event_log.csv is the primary behavioral record. Intent Precision scores come from expert ratings and
          researcher coding — not from click counts or writing speed.
        </p>
        <h2>{t.serverSubmissions}</h2>
        <p className="hint">{t.storageHint}</p>
        <p className={health?.storage_ready ? 'api-status ok' : 'api-status bad'}>
          {health
            ? `storage: ${health.storage || 'unknown'}${health.storage_ready ? '' : ' (not ready)'}`
            : t.apiChecking}
        </p>
        <div className="stack">
          <Field label={t.viewToken}>
            <input
              type="password"
              value={token}
              autoComplete="off"
              onChange={(e) => setToken(e.target.value)}
            />
          </Field>
          <Button onClick={() => void loadServer()} disabled={loading}>
            {t.loadServerData}
          </Button>
          <Button
            onClick={() => {
              const params = token ? `?token=${encodeURIComponent(token)}&format=html` : '?format=html'
              window.open(`/api/chitest-session/${params}`, '_blank')
            }}
          >
            {t.openServerList}
          </Button>
          {serverError ? <p className="api-status bad">{serverError}</p> : null}
          {records.map((item) => (
            <Button key={item.id} onClick={() => void downloadRemote(item)}>
              {t.downloadServerJson}: {item.participant_id} · {item.kind} · {item.uploaded_at}
            </Button>
          ))}
        </div>
        <div className="stack">
          <Button onClick={downloadFullJson}>Download full JSON</Button>
          <Button onClick={downloadParticipantCsv}>Download participants.csv</Button>
          <Button onClick={downloadTaskCsv}>Download tasks.csv</Button>
          <Button onClick={downloadEventLogCsv}>Download event_log.csv</Button>
          <Button onClick={downloadIntentCsv}>Download intents.csv</Button>
          <Button onClick={downloadGenerationsCsv}>Download generations.csv</Button>
          <Button onClick={downloadSketchInteractionsCsv}>Download sketch_interactions.csv</Button>
          <Button onClick={downloadAutoPromptsCsv}>Download auto_prompts.csv</Button>
          <Button onClick={downloadSketchSnapshotsJson}>Download sketch_snapshots.json</Button>
          <Button onClick={downloadExpertRatingsCsv}>Download expert_ratings.csv</Button>
          <Button onClick={downloadTimelinesJson}>Download full_session_timeline.json</Button>
          {store.sessions.map((session) => (
            <Button key={session.session_id} onClick={() => void downloadParticipantPacket(session)}>
              Download {session.participant_id} packet
            </Button>
          ))}
        </div>
      </main>
      <FooterBar>
        <Button onClick={() => (window.location.hash = '#/')}>Home</Button>
        <Button
          onClick={() => {
            if (confirm('Clear all local CHItest data on this browser?')) {
              clearAllData()
              window.location.reload()
            }
          }}
        >
          Clear local data
        </Button>
      </FooterBar>
    </Shell>
  )
}
