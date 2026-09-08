import { useMemo, useState } from 'react'
import { getImage, stimulusUrl } from '../shared/config'
import { textAt } from '../shared/export'
import { emptyPrecision, precisionComplete, precisionTotal } from '../shared/metrics'
import { allCompletedTrials, getSession, loadStore, upsertCoding } from '../shared/store'
import { nowIso } from '../shared/time'
import type { IntentCoding, PrecisionDim, PrecisionScores, TaskRun, Timepoint } from '../shared/types'
import { PRECISION_DIMS } from '../shared/types'
import { Button, FooterBar, Likert, Shell } from '../shared/ui'

const DIM_HINT: Record<PrecisionDim, string> = {
  object: 'Who/what is in the shot?',
  spatial: 'Where are they in space / FG-MG-BG / left-right?',
  relation: 'How do subjects relate (who looks at whom, near/far)?',
  camera: 'Where is the camera relative to subjects?',
  emotion: 'Attention, gaze, mood that the shot must show?',
  constraint: 'Any staging limit the shot must obey?',
}

interface Unit {
  trial: TaskRun
  timepoint: Timepoint
  text: string
}

function unitsFromTrials(trials: TaskRun[]): Unit[] {
  const units: Unit[] = []
  for (const trial of trials) {
    const session = getSession(trial.participant_id)
    if (!session) continue
    const initial = textAt(session, trial, 'initial')
    const final = textAt(session, trial, 'final')
    if (trial.stage !== 'T0' && initial) units.push({ trial, timepoint: 'initial', text: initial })
    if (final) units.push({ trial, timepoint: 'final', text: final })
  }
  return units
}

export function CodingApp() {
  const [coderId, setCoderId] = useState('researcher_01')
  const [started, setStarted] = useState(false)
  const [, setVersion] = useState(0)
  const trials = useMemo(() => allCompletedTrials(), [])
  const units = unitsFromTrials(trials)
  const store = loadStore()

  if (!started) {
    return (
      <Shell title="Researcher coding" subtitle="Intent Precision 0–18">
        <main className="page">
          <p className="lead">
            Code each description on six dimensions (0–18). Do not score length, jargon, or writing quality.
            Condition is hidden.
          </p>
          <label className="field">
            <span>Coder ID</span>
            <input value={coderId} onChange={(e) => setCoderId(e.target.value)} />
          </label>
        </main>
        <FooterBar>
          <Button fill disabled={!coderId.trim()} onClick={() => setStarted(true)}>
            Continue
          </Button>
        </FooterBar>
      </Shell>
    )
  }

  const remaining = units.filter(
    (unit) =>
      !store.codings.some(
        (item) =>
          item.trial_id === unit.trial.task_id &&
          item.timepoint === unit.timepoint &&
          item.coder_id === coderId,
      ),
  )
  const current = remaining[0]
  const done = units.length - remaining.length

  if (!current) {
    return (
      <Shell title="Researcher coding" subtitle={coderId} meta={`${done} coded`}>
        <main className="page">
          <p className="lead">All available descriptions are coded for {coderId}.</p>
        </main>
        <FooterBar>
          <Button onClick={() => (window.location.hash = '#/export')}>Export</Button>
        </FooterBar>
      </Shell>
    )
  }

  return (
    <CodingForm
      key={`${current.trial.task_id}-${current.timepoint}`}
      coderId={coderId}
      unit={current}
      done={done}
      remaining={remaining.length}
      onSubmit={() => setVersion((n) => n + 1)}
    />
  )
}

function CodingForm({
  coderId,
  unit,
  done,
  remaining,
  onSubmit,
}: {
  coderId: string
  unit: Unit
  done: number
  remaining: number
  onSubmit: () => void
}) {
  const image = getImage(unit.trial.image_id)
  const [precision, setPrecision] = useState<PrecisionScores>(emptyPrecision)
  const [naturalness, setNaturalness] = useState<number | null>(null)
  const [copying, setCopying] = useState<number | null>(null)
  const ready = precisionComplete(precision)
  const total = precisionTotal(precision)

  return (
    <Shell title="Researcher coding" subtitle={unit.timepoint} meta={`${done} done · ${remaining} left`}>
      <main className="eval">
        <section className="materials">
          <h2>Picture</h2>
          <img className="stimulus-small" src={stimulusUrl(image.image_path)} alt="" />
          <h2>Description</h2>
          <pre className="intent-block">{unit.text || '—'}</pre>
        </section>
        <section className="scores">
          <h2>Intent Precision (0–3 each, total {total ?? '—'} / 18)</h2>
          <p className="hint">0 absent · 1 vague · 2 partial · 3 clear and executable</p>
          {PRECISION_DIMS.map((dim) => (
            <DimScale
              key={dim}
              label={dim}
              hint={DIM_HINT[dim]}
              value={precision[dim]}
              onChange={(n) => setPrecision({ ...precision, [dim]: n })}
            />
          ))}
          {unit.timepoint === 'final' ? (
            <>
              <Likert
                label="Naturalness"
                hint="Does this remain the participant's own language rather than a formulaic prompt?"
                value={naturalness}
                onChange={setNaturalness}
              />
              <Likert
                label="Copying"
                hint="How much does the text copy system/AI wording? 1 = authored, 7 = copied."
                value={copying}
                onChange={setCopying}
              />
            </>
          ) : null}
        </section>
      </main>
      <FooterBar>
        <Button
          fill
          disabled={!ready}
          onClick={() => {
            const coding: IntentCoding = {
              participant_id: unit.trial.participant_id,
              trial_id: unit.trial.task_id,
              task_id: unit.trial.task_id,
              stage: unit.trial.stage,
              timepoint: unit.timepoint,
              coder_id: coderId,
              precision,
              precision_total: precisionTotal(precision),
              naturalness: unit.timepoint === 'final' ? naturalness : null,
              copying: unit.timepoint === 'final' ? copying : null,
              coded_at: nowIso(),
            }
            upsertCoding(coding)
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
