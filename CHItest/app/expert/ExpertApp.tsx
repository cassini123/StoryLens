import { useMemo, useState } from 'react'
import { experiment, getImage, stimulusUrl } from '../shared/config'
import { textAt } from '../shared/export'
import { allCompletedTrials, getSession, ratingsForExpert, upsertRating } from '../shared/store'
import { nowIso } from '../shared/time'
import type { ExpertRating, TaskRun } from '../shared/types'
import { Button, FooterBar, Likert, Shell, YesNo } from '../shared/ui'

function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffleForExpert(trials: TaskRun[], expertId: string): TaskRun[] {
  return [...trials].sort((a, b) => {
    const ha = hashString(`${expertId}:${a.task_id}`)
    const hb = hashString(`${expertId}:${b.task_id}`)
    return ha === hb ? a.task_id.localeCompare(b.task_id) : ha - hb
  })
}

function ready(rating: {
  interpretability: number | null
  spatial_specificity: number | null
  temporal_action_specificity: number | null
  executability: number | null
  overall_precision: number | null
  reconstructable: boolean | null
}) {
  return (
    rating.interpretability != null &&
    rating.spatial_specificity != null &&
    rating.temporal_action_specificity != null &&
    rating.executability != null &&
    rating.overall_precision != null &&
    rating.reconstructable != null
  )
}

export function ExpertApp() {
  const [expertId, setExpertId] = useState<string | null>(null)
  const [, setVersion] = useState(0)
  const trials = useMemo(
    () => allCompletedTrials().filter((trial) => trial.stage !== 'T0'),
    [],
  )

  if (!expertId) {
    return (
      <Shell title="Expert evaluation" subtitle="Blind rating">
        <main className="page">
          <p className="lead">
            Score whether the final wording clearly, specifically, and executably conveys the next
            shot the participant wants. There is no unique correct answer. Materials hide condition,
            stage, Sketch, Auto Prompt, drafts, and generated images. Do not score creativity or
            jargon.
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
  const remaining = shuffleForExpert(
    trials.filter((trial) => !done.some((item) => item.trial_id === trial.task_id)),
    expertId,
  )
  const current = remaining[0]

  if (!current) {
    return (
      <Shell title="Expert evaluation" subtitle={expert?.label} meta={`${done.length} rated`}>
        <main className="page">
          <p className="lead">No remaining next-shot descriptions for {expert?.label}.</p>
          <p>{done.length} independent ratings saved. T0 observation trials are excluded.</p>
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
  const finalText = session ? textAt(session, trial, 'final') : trial.final_text
  const [interpretability, setInterpretability] = useState<number | null>(null)
  const [spatial, setSpatial] = useState<number | null>(null)
  const [temporal, setTemporal] = useState<number | null>(null)
  const [executability, setExecutability] = useState<number | null>(null)
  const [overall, setOverall] = useState<number | null>(null)
  const [reconstructable, setReconstructable] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const canSubmit = ready({
    interpretability,
    spatial_specificity: spatial,
    temporal_action_specificity: temporal,
    executability,
    overall_precision: overall,
    reconstructable,
  })

  return (
    <Shell title="Expert evaluation" subtitle={expertLabel} meta={`${done} done · ${remaining} left`}>
      <main className="eval">
        <section className="materials">
          <h2>Current visual state</h2>
          <img className="stimulus-small" src={stimulusUrl(image.image_path)} alt="" />
          {image.current_visual_state ? <p>{image.current_visual_state}</p> : null}
          <h2>Participant final expression</h2>
          <p className="hint">
            Score the wording of the next shot they want. Do not judge whether it is a good idea, and
            do not compare it to a hidden target.
          </p>
          <pre className="intent-block">{finalText || '—'}</pre>
        </section>
        <section className="scores">
          <h2>Ratings (1–7)</h2>
          <Likert
            label="Visual Intent Interpretability"
            hint="From this still and text, how clearly do you understand the intended next shot?"
            value={interpretability}
            onChange={setInterpretability}
          />
          <Likert
            label="Spatial / Relational Specificity"
            hint="People, objects, position, distance, direction, composition. Do not auto-penalize action-only shots."
            value={spatial}
            onChange={setSpatial}
          />
          <Likert
            label="Temporal / Action Specificity"
            hint="What happens next: action, state change, sequence?"
            value={temporal}
            onChange={setTemporal}
          />
          <Likert
            label="Executability / Reconstructability"
            hint="Could an experienced visual creator build a matching next shot from this text?"
            value={executability}
            onChange={setExecutability}
          />
          <Likert
            label="Overall Expression Precision"
            hint="How precisely does the wording turn visual intent into clear, executable language?"
            value={overall}
            onChange={setOverall}
          />
          <YesNo
            label="Reconstructable"
            hint="Without asking the participant more questions, can a definite next-shot plan be formed?"
            value={reconstructable}
            onChange={setReconstructable}
          />
          <label className="field">
            <span>Optional comment (one line)</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </label>
        </section>
      </main>
      <FooterBar>
        <Button onClick={onSwitch}>Switch expert</Button>
        <Button
          fill
          disabled={!canSubmit}
          onClick={() => {
            const rating: ExpertRating = {
              trial_id: trial.task_id,
              participant_id: trial.participant_id,
              task_id: trial.task_id,
              stage: trial.stage,
              expert_id: expertId,
              interpretability,
              spatial_specificity: spatial,
              temporal_action_specificity: temporal,
              executability,
              overall_precision: overall,
              reconstructable: reconstructable ? 1 : 0,
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
