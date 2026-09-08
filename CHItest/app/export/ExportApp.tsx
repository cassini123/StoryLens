import {
  downloadExpertRatingsCsv,
  downloadFullJson,
  downloadIntentCsv,
  downloadParticipantCsv,
  downloadSketchInteractionsCsv,
} from '../shared/export'
import { clearAllData, loadStore } from '../shared/store'
import { Button, FooterBar, Shell } from '../shared/ui'

export function ExportApp() {
  const store = loadStore()
  const trialCount = store.sessions.reduce((n, session) => n + session.trials.length, 0)
  return (
    <Shell title="Export" subtitle="JSON / CSV">
      <main className="page">
        <p className="lead">
          {store.sessions.length} sessions · {trialCount} trials · {store.ratings.length} expert
          ratings · {store.codings.length} researcher codes
        </p>
        <p>Expert ratings and researcher G1 codes are stored separately. Exports never average scores or compute a GISI total.</p>
        <div className="stack">
          <Button onClick={downloadFullJson}>Download full JSON</Button>
          <Button onClick={downloadParticipantCsv}>Download participant.csv</Button>
          <Button onClick={downloadIntentCsv}>Download intent.csv</Button>
          <Button onClick={downloadSketchInteractionsCsv}>Download sketch_interactions.csv</Button>
          <Button onClick={downloadExpertRatingsCsv}>Download expert_ratings.csv</Button>
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
