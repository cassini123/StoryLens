import { useEffect, useState } from 'react'
import { experiment } from './shared/config'
import { checkJimengHealth, type JimengHealth } from './shared/jimeng'
import { Button, Shell } from './shared/ui'

export function Home() {
  const [health, setHealth] = useState<JimengHealth | null>(null)

  useEffect(() => {
    void checkJimengHealth().then(setHealth)
  }, [])

  const apiReady = Boolean(health?.credentials)
  const apiLabel = !health
    ? 'Checking Jimeng API…'
    : apiReady
      ? 'Jimeng API connected'
      : health.error || 'Jimeng API is not configured on this deployment'

  return (
    <Shell title={experiment.study.title} subtitle={experiment.study.subtitle}>
      <main className="page">
        <p className="lead">
          A controlled study of sketch-based cognitive scaffolding for generative image models.
        </p>
        <p>
          Each participant completes 7 pictures from a 20-image pool: T0 baseline, T1 AI visual feedback, T2
          sketch intervention, and T3 transfer with sketch. Generated images are feedback. The primary outcome
          is Intent Precision, not click counts or speed.
        </p>
        <p className={apiReady ? 'api-status ok' : 'api-status bad'}>{apiLabel}</p>
        {!apiReady && health ? (
          <p className="hint">
            Vercel Production must define <code>JIMENG_ACCESS_KEY</code> and <code>JIMENG_SECRET_KEY</code>,
            then Redeploy.
          </p>
        ) : null}
        <div className="stack">
          <Button fill onClick={() => (window.location.hash = '#/participant')}>
            Participant
          </Button>
          <Button onClick={() => (window.location.hash = '#/expert')}>Expert evaluation</Button>
          <Button onClick={() => (window.location.hash = '#/coding')}>Researcher coding</Button>
          <Button onClick={() => (window.location.hash = '#/export')}>Export</Button>
        </div>
      </main>
    </Shell>
  )
}
