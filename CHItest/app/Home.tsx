import { experiment } from './shared/config'
import { Button, Shell } from './shared/ui'

export function Home() {
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
