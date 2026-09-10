import { useMemo, useState } from 'react'
import { experiment, getImage, stimulusUrl } from '../shared/config'
import { textAt } from '../shared/export'
import { emptyPrecision, precisionComplete } from '../shared/metrics'
import { allCompletedTrials, getSession, ratingsForExpert, upsertRating } from '../shared/store'
import { nowIso } from '../shared/time'
import type { ExpertRating, PrecisionDim, PrecisionScores, TaskRun } from '../shared/types'
import { PRECISION_DIMS } from '../shared/types'
import { Button, FooterBar, Likert, Shell } from '../shared/ui'

const DIM_HINT: Record<PrecisionDim, string> = {
  object: 'Who/what is in the shot, and any occlusion or object-as-subject change?',
  spatial: 'Where are they in space / distance / left-right / depth?',
  relation: 'How do subjects relate (behind/beside, gaze, facing)?',
  camera: 'Camera height, distance, or orientation relative to subjects?',
  emotion: 'Attention, gaze, mood that the shot must show?',
  constraint: 'Any staging limit the shot must obey?',
}

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

function complete(precision: PrecisionScores, active: PrecisionDim[], interpretability: number | null, specificity: number | null, executability: number | null) {
  return precisionComplete(precision, active) && interpretability != null && specificity != null && executability != null
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
            Score the participant’s final wording against the target visual relations. Materials hide
            condition, stage, sketch logs, Auto Prompt, and participant background. Do not score
            image quality or professional terminology.
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
          <p className="lead">No remaining modification tasks for {expert?.label}.</p>
          <p>{done.length} independent ratings saved. T0 description trials are excluded from Intent Precision.</p>
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
  const active = (image.target_dimensions.length ? image.target_dimensions : PRECISION_DIMS).filter(
    (dim) => image.target_modification?.[dim],
  )
  const dims = active.length ? active : image.target_dimensions
  const [precision, setPrecision] = useState<PrecisionScores>(emptyPrecision)
  const [interpretability, setInterpretability] = useState<number | null>(null)
  const [specificity, setSpecificity] = useState<number | null>(null)
  const [executability, setExecutability] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const ready = complete(precision, dims, interpretability, specificity, executability)

  return (
    <Shell title="Expert evaluation" subtitle={expertLabel} meta={`${done} done · ${remaining} left`}>
      <main className="eval">
        <section className="materials">
          <h2>Picture (current visual state)</h2>
          <img className="stimulus-small" src={stimulusUrl(image.image_path)} alt="" />
          {image.current_visual_state ? <p>{image.current_visual_state}</p> : null}
          <h2>Target modification specification</h2>
          <p className="hint">
            Score whether the final wording expresses each target relation. Do not decide what the
            picture “should” become on your own, and do not score similarity to the still.
          </p>
          {image.target_modification ? (
            <ul>
              {Object.entries(image.target_modification).map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> {value}
                </li>
              ))}
            </ul>
          ) : null}
          <h2>Participant final expression</h2>
          <pre className="intent-block">{finalText || '—'}</pre>
        </section>
        <section className="scores">
          <h2>Intent Precision (0–3 each)</h2>
          <p className="hint">
            0 absent · 1 mentioned but vague · 2 relation explicit, missing reconstructable detail · 3
            precise enough to rebuild. Score functional visual relations, not jargon.
          </p>
          {dims.map((dim) => (
            <DimScale
              key={dim}
              label={dim}
              hint={`${DIM_HINT[dim]} Target: ${image.target_modification?.[dim] ?? ''}`}
              value={precision[dim]}
              onChange={(n) => setPrecision({ ...precision, [dim]: n })}
            />
          ))}
          <h2>Global ratings (1–7)</h2>
          <Likert
            label="Intent Interpretability"
            hint="From this text alone, how clearly do you understand the intended change?"
            value={interpretability}
            onChange={setInterpretability}
          />
          <Likert
            label="Spatial / Relational Specificity"
            hint="How clearly are people, objects, space, distance, direction, and camera specified?"
            value={specificity}
            onChange={setSpecificity}
          />
          <Likert
            label="Executability"
            hint="Could an experienced visual creator carry out this modification from the text?"
            value={executability}
            onChange={setExecutability}
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
          disabled={!ready}
          onClick={() => {
            const rating: ExpertRating = {
              trial_id: trial.task_id,
              participant_id: trial.participant_id,
              task_id: trial.task_id,
              stage: trial.stage,
              expert_id: expertId,
              precision,
              interpretability,
              specificity,
              executability,
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

function DimScale({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <div className="likert">
      <div className="likert-label">
        <strong>{label}</strong>
        <p>{hint}</p>
      </div>
      <div className="likert-scale" role="radiogroup" aria-label={label}>
        {[0, 1, 2, 3].map((n) => (
          <button key={n} type="button" className={value === n ? 'tick on' : 'tick'} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
