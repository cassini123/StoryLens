import { downloadOfficialZip } from '../shared/export'
import { markExportReadiness } from '../shared/validation'
import { clearAllData, loadStore } from '../shared/store'
import { Button, FooterBar, Shell } from '../shared/ui'

export function ExportApp() {
  const store = loadStore()
  const taskCount = store.sessions.reduce((n, session) => n + session.tasks.length, 0)
  const eventCount = store.sessions.reduce((n, session) => n + session.event_log.length, 0)
  return (
    <Shell title="Export" subtitle="One zip of every official table">
      <main className="page">
        <p className="lead">
          {store.sessions.length} sessions · {taskCount} tasks · {eventCount} events · {store.ratings.length}{' '}
          expert ratings · {store.codings.length} researcher codes
        </p>
        <p>Participant complete page also packs that person’s own zip. Group in the tables is 0 (four T1s) or 1 (T1 T1 T2 T2).</p>
        <div className="stack">
          {store.sessions.map((session) => {
            const validation = markExportReadiness(session)
            return (
              <p key={`${session.session_id}-val`}>
                {session.participant_id}:{' '}
                {validation.ok && session.completed_at
                  ? 'export ready'
                  : validation.ok
                    ? 'validation passed, session incomplete'
                    : `validation failed (${validation.issues.length})`}
              </p>
            )
          })}
          <Button fill onClick={downloadOfficialZip}>
            Download zip
          </Button>
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
