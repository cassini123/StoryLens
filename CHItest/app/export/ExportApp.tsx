import {
  downloadEventLogCsv,
  downloadExpertRatingsCsv,
  downloadFullJson,
  downloadGenerationsCsv,
  downloadIntentCsv,
  downloadParticipantCsv,
  downloadParticipantPacket,
  downloadSketchInteractionsCsv,
  downloadSketchSnapshotsJson,
  downloadTaskCsv,
  downloadTimelinesJson,
} from '../shared/export'
import { clearAllData, loadStore } from '../shared/store'
import { Button, FooterBar, Shell } from '../shared/ui'

export function ExportApp() {
  const store = loadStore()
  const taskCount = store.sessions.reduce((n, session) => n + session.tasks.length, 0)
  const eventCount = store.sessions.reduce((n, session) => n + session.event_log.length, 0)
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
        <div className="stack">
          <Button onClick={downloadFullJson}>Download full JSON</Button>
          <Button onClick={downloadParticipantCsv}>Download participants.csv</Button>
          <Button onClick={downloadTaskCsv}>Download tasks.csv</Button>
          <Button onClick={downloadEventLogCsv}>Download event_log.csv</Button>
          <Button onClick={downloadIntentCsv}>Download intents.csv</Button>
          <Button onClick={downloadGenerationsCsv}>Download generations.csv</Button>
          <Button onClick={downloadSketchInteractionsCsv}>Download sketch_interactions.csv</Button>
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
