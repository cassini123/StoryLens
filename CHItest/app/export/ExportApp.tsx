import {
  downloadFullJson,
  downloadRatingsCsv,
  downloadRatingsJson,
  downloadSessionsJson,
  downloadTrialsCsv,
  downloadTrialsJson,
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
          {store.sessions.length} sessions · {trialCount} trials · {store.ratings.length} expert ratings
        </p>
        <p>Expert ratings are stored independently per expert. Exports never average scores.</p>
        <div className="stack">
          <Button onClick={downloadFullJson}>Download full JSON</Button>
          <Button onClick={downloadSessionsJson}>Download sessions JSON</Button>
          <Button onClick={downloadTrialsJson}>Download trials JSON</Button>
          <Button onClick={downloadTrialsCsv}>Download trials CSV</Button>
          <Button onClick={downloadRatingsJson}>Download ratings JSON (by expert)</Button>
          <Button onClick={downloadRatingsCsv}>Download ratings CSV</Button>
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
