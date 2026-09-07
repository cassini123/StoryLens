import { useState } from 'react'
import { experiment, getTask } from '../shared/config'
import { SceneView } from '../shared/sketch/SceneView'
import { allCompletedTrials, ratingsForExpert, upsertRating } from '../shared/store'
import { nowIso } from '../shared/time'
import type { ExpertRating, RubricScores, Trial } from '../shared/types'
import { Button, FooterBar, Likert, Shell } from '../shared/ui'

const emptyScores = (): RubricScores => ({
  intent_precision: null,
  intent_interpretability: null,
  spatial_specificity: null,
  executability: null,
})

function complete(scores: RubricScores): boolean {
  return (
    scores.intent_precision != null &&
    scores.intent_interpretability != null &&
    scores.spatial_specificity != null &&
    scores.executability != null
  )
}

export function ExpertApp() {
  const [expertId, setExpertId] = useState<string | null>(null)
  const [, setVersion] = useState(0)
  const trials = allCompletedTrials()

  if (!expertId) {
    return (
      <Shell title="Expert evaluation" subtitle="Blind rating">
        <main className="page">
          <p className="lead">Select your evaluator ID. Rating materials do not include condition, participant background, or interaction logs.</p>
          <div className="stack">
            {experiment.experts.map((expert) => (
              <Button key={expert.expert_id} onClick={() => setExpertId(expert.expert_id)}>
                {expert.label} · {expert.name}
              </Button>
            ))}
          </div>
        </main>
      </Shell>
    )
  }

  const expert = experiment.experts.find((item) => item.expert_id === expertId)
  const done = ratingsForExpert(expertId)
  const remaining = trials.filter((trial) => !done.some((item) => item.trial_id === trial.trial_id))
  const current = remaining[0]

  if (!current) {
    return (
      <Shell title="Expert evaluation" subtitle={expert?.label} meta={`${done.length} rated`}>
        <main className="page">
          <p className="lead">No remaining trials for {expert?.label}.</p>
          <p>{done.length} independent ratings saved.</p>
        </main>
        <FooterBar>
          <Button onClick={() => setExpertId(null)}>Switch expert</Button>
          <Button onClick={() => (window.location.hash = '#/export')}>Export</Button>
        </FooterBar>
      </Shell>
    )
  }

  return (
    <RatingScreen
      key={current.trial_id}
      expertId={expertId}
      expertLabel={expert?.label ?? expertId}
      remaining={remaining.length}
      done={done.length}
      trial={current}
      onSubmit={() => setVersion((n) => n + 1)}
      onSwitch={() => setExpertId(null)}
    />
  )
}

function RatingScreen({
  expertId,
  expertLabel,
  remaining,
  done,
  trial,
  onSubmit,
  onSwitch,
}: {
  expertId: string
  expertLabel: string
  remaining: number
  done: number
  trial: Trial
  onSubmit: () => void
  onSwitch: () => void
}) {
  const task = getTask(trial.task_id)
  const [initial, setInitial] = useState<RubricScores>(emptyScores)
  const [final, setFinal] = useState<RubricScores>(emptyScores)
  const [naturalness, setNaturalness] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const scene = trial.final_sketch?.output.scene ?? trial.initial_sketch?.output.scene ?? null
  const ready = complete(initial) && complete(final)

  return (
    <Shell
      title="Expert evaluation"
      subtitle={expertLabel}
      meta={`${trial.trial_id} · ${done} done · ${remaining} left`}
    >
      <main className="eval">
        <section className="materials">
          <h2>Task</h2>
          <p className="lead">{task.brief}</p>
          <h2>Initial intent</h2>
          <pre className="intent-block">{trial.initial_intent || '—'}</pre>
          <h2>Final intent</h2>
          <pre className="intent-block">{trial.final_intent || '—'}</pre>
          <h2>Final sketch</h2>
          {scene ? (
            <SceneView scene={scene} />
          ) : (
            <div className="empty-sketch">Sketch not collected for this trial.</div>
          )}
        </section>
        <section className="scores">
          <h2>Initial intent</h2>
          <Rubric value={initial} onChange={setInitial} />
          <h2>Final intent</h2>
          <Rubric value={final} onChange={setFinal} />
          <Likert
            label="Naturalness"
            hint="Does the final description remain a natural expression of the participant's own intent rather than a formulaic prompt? Auxiliary metric."
            value={naturalness}
            onChange={setNaturalness}
          />
          <label className="field">
            <span>Comment</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
          </label>
        </section>
      </main>
      <FooterBar>
        <Button onClick={onSwitch}>Switch expert</Button>
        <Button
          fill
          disabled={!ready}
          onClick={() => {
            const rating: ExpertRating = {
              trial_id: trial.trial_id,
              expert_id: expertId,
              initial,
              final,
              naturalness,
              comment,
              submitted_at: nowIso(),
            }
            upsertRating(rating)
            onSubmit()
          }}
        >
          Submit
        </Button>
      </FooterBar>
    </Shell>
  )
}

function Rubric({
  value,
  onChange,
}: {
  value: RubricScores
  onChange: (value: RubricScores) => void
}) {
  return (
    <>
      <Likert
        label="Intent Precision"
        hint="How precisely does the participant's description communicate the intended shot?"
        value={value.intent_precision}
        onChange={(n) => onChange({ ...value, intent_precision: n })}
      />
      <Likert
        label="Interpretability"
        hint="How reliably could a filmmaker reconstruct the intended shot from the participant's description?"
        value={value.intent_interpretability}
        onChange={(n) => onChange({ ...value, intent_interpretability: n })}
      />
      <Likert
        label="Spatial / Relational Specificity"
        hint="How clearly are spatial and relational aspects of the shot communicated?"
        value={value.spatial_specificity}
        onChange={(n) => onChange({ ...value, spatial_specificity: n })}
      />
      <Likert
        label="Executability"
        hint="How actionable is the description for producing or staging the intended shot?"
        value={value.executability}
        onChange={(n) => onChange({ ...value, executability: n })}
      />
    </>
  )
}
