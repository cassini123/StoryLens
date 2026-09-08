import { Button, Shell } from './shared/ui'

export function Home() {
  return (
    <Shell title="Cinematography Expression Study" subtitle="CHI 2027 research prototype">
      <main className="page">
        <p className="lead">
          A controlled study of whether a low-fidelity sketch scaffold helps people express cinematographic
          intent more precisely.
        </p>
        <p>The system records intent, sketch interaction, and expert blind ratings. It does not generate final images or rewrite prompts.</p>
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
