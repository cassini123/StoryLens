import { useState } from 'react'
import { experiment, getImage, stimulusUrl } from '../shared/config'
import { textAt } from '../shared/export'
import { allCompletedTrials, getSession, ratingsForExpert, upsertRating } from '../shared/store'
import { nowIso } from '../shared/time'
import type { ExpertRating, RubricScores, TaskRun } from '../shared/types'
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
          <p className="lead">
            Select your evaluator ID. Score whether the description expresses the task’s intended
            modification. Do not score similarity to the still. Materials hide participant ID,
            condition, logs, round count, and background.
          </p>
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
  const remaining = trials.filter((trial) => !done.some((item) => item.trial_id === trial.task_id))
  const current = remaining[0]

  if (!current) {
    return (
      <Shell title="Expert evaluation" subtitle={expert?.label} meta={`${done.length} rated`}>
        <main className="page">
          <p className="lead">No remaining tasks for {expert?.label}.</p>
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
      key={current.task_id}
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
  trial: TaskRun
  onSubmit: () => void
  onSwitch: () => void
}) {
  const image = getImage(trial.image_id)
  const session = getSession(trial.participant_id)
  const initialText = session ? textAt(session, trial, 'initial') : ''
  const finalText = session ? textAt(session, trial, 'final') : ''
  const single = trial.stage === 'T0' || initialText === finalText
  const [initial, setInitial] = useState<RubricScores>(emptyScores)
  const [final, setFinal] = useState<RubricScores>(emptyScores)
  const [naturalness, setNaturalness] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const ready = single ? complete(final) : complete(initial) && complete(final)

  return (
    <Shell title="Expert evaluation" subtitle={expertLabel} meta={`${done} done · ${remaining} left`}>
      <main className="eval">
        <section className="materials">
          <h2>Picture (current visual state)</h2>
          <img className="stimulus-small" src={stimulusUrl(image.image_path)} alt="" />
          <h2>Target modification</h2>
          <p className="hint">
            Judge whether the participant’s wording accurately expresses this intended change — not
            whether the description recreates the still.
          </p>
          {image.current_visual_state ? <p>{image.current_visual_state}</p> : null}
          {image.target_modification ? (
            <ul>
              {Object.entries(image.target_modification).map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> {value}
                </li>
              ))}
            </ul>
          ) : null}
          {single ? (
            <>
              <h2>Description</h2>
              <pre className="intent-block">{finalText || '—'}</pre>
            </>
          ) : (
            <>
              <h2>Description A</h2>
              <pre className="intent-block">{initialText || '—'}</pre>
              <h2>Description B</h2>
              <pre className="intent-block">{finalText || '—'}</pre>
            </>
          )}
        </section>
        <section className="scores">
          {single ? null : (
            <>
              <h2>Description A</h2>
              <Rubric value={initial} onChange={setInitial} />
            </>
          )}
          <h2>{single ? 'Description' : 'Description B'}</h2>
          <Rubric value={final} onChange={setFinal} />
          <Likert
            label="Naturalness"
            hint="Does the description remain a natural expression of the participant's own intent rather than a formulaic prompt? Auxiliary metric."
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
              trial_id: trial.task_id,
              participant_id: trial.participant_id,
              task_id: trial.task_id,
              stage: trial.stage,
              expert_id: expertId,
              initial: single ? final : initial,
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
        hint="How precisely does the description communicate the intended modification for this task?"
        value={value.intent_precision}
        onChange={(n) => onChange({ ...value, intent_precision: n })}
      />
      <Likert
        label="Interpretability"
        hint="How reliably could someone reconstruct the intended modification from this description?"
        value={value.intent_interpretability}
        onChange={(n) => onChange({ ...value, intent_interpretability: n })}
      />
      <Likert
        label="Spatial / Relational Specificity"
        hint="How clearly are spatial and relational aspects communicated?"
        value={value.spatial_specificity}
        onChange={(n) => onChange({ ...value, spatial_specificity: n })}
      />
      <Likert
        label="Executability"
        hint="How actionable is the description for carrying out the intended modification?"
        value={value.executability}
        onChange={(n) => onChange({ ...value, executability: n })}
      />
    </>
  )
}
