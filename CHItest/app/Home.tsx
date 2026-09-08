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
          A controlled study of whether a low-fidelity sketch scaffold helps people express visual intent
          more precisely after generative-image feedback.
        </p>
        <p>
          Participants describe a still image, see an AI-generated result, then revise. The Sketch condition
          adds an editable low-fidelity scaffold. The system records intents, generated images, sketch
          actions, and expert ratings. Image quality is feedback, not the primary score.
        </p>
        <p className={apiReady ? 'api-status ok' : 'api-status bad'}>{apiLabel}</p>
        {!apiReady && health ? (
          <p className="hint">
            Vercel Production must define <code>JIMENG_ACCESS_KEY</code> and <code>JIMENG_SECRET_KEY</code>,
            then Redeploy. Preview-only env vars are not visible on 2027mitgo.top.
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
