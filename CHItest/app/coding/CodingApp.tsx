import { useMemo, useState } from 'react'
import { getTask } from '../shared/config'
import {
  discoveryRate,
  emptyPrecision,
  learningGain,
  mean,
  newlyDiscoveredDims,
  precisionComplete,
  precisionTotal,
  transferGain,
} from '../shared/metrics'
import { allCompletedTrials, loadStore, upsertCoding } from '../shared/store'
import { nowIso } from '../shared/time'
import type { IntentCoding, PrecisionDim, PrecisionScores, Timepoint, Trial } from '../shared/types'
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
  trial: Trial
  timepoint: Timepoint
  text: string
}

function unitsFromTrials(trials: Trial[]): Unit[] {
  const units: Unit[] = []
  for (const trial of trials) {
    if (trial.condition === 'transfer') {
      units.push({ trial, timepoint: 'T3', text: trial.t3_intent || trial.final_intent || trial.initial_intent })
      continue
    }
    units.push({ trial, timepoint: 'T1', text: trial.t1_intent || trial.initial_intent })
    units.push({ trial, timepoint: 'T2', text: trial.t2_intent || trial.final_intent })
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
      <Shell title="Researcher coding" subtitle="G1 Intent Precision · G2 Naturalness · G3 Discovery">
        <main className="page">
          <p className="lead">
            Code each intent on six dimensions (0–18). Do not score length, jargon, or writing quality.
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
          item.trial_id === unit.trial.trial_id &&
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
          <p className="lead">All available intents are coded for {coderId}.</p>
        </main>
        <FooterBar>
          <Button onClick={() => (window.location.hash = '#/export')}>Export</Button>
        </FooterBar>
      </Shell>
    )
  }

  return (
    <CodingForm
      key={`${current.trial.trial_id}-${current.timepoint}`}
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
  const task = getTask(unit.trial.task_id)
  const [precision, setPrecision] = useState<PrecisionScores>(emptyPrecision)
  const [naturalness, setNaturalness] = useState<number | null>(null)
  const [copying, setCopying] = useState<number | null>(null)
  const ready = precisionComplete(precision)
  const total = precisionTotal(precision)
  const store = loadStore()
  const t1 = store.codings.find(
    (item) => item.trial_id === unit.trial.trial_id && item.timepoint === 'T1' && item.coder_id === coderId,
  )
  const discovery =
    unit.timepoint === 'T2' && t1 && ready
      ? discoveryRate(t1.precision, precision, task.required_dimensions)
      : null
  const discovered =
    unit.timepoint === 'T2' && t1 && ready
      ? newlyDiscoveredDims(t1.precision, precision, task.required_dimensions)
      : []

  return (
    <Shell
      title="Researcher coding"
      subtitle={`${unit.timepoint} · ${task.title}`}
      meta={`${done} done · ${remaining} left`}
    >
      <main className="eval">
        <section className="materials">
          <h2>Task</h2>
          <p className="lead">{task.brief}</p>
          <h2>{unit.timepoint} intent</h2>
          <pre className="intent-block">{unit.text || '—'}</pre>
          {unit.timepoint === 'T2' && t1 ? (
            <p className="hint">
              Discovery rate: {discovery == null ? 'n/a (nothing missing at T1)' : discovery.toFixed(2)}
              {discovered.length ? ` · new: ${discovered.join(', ')}` : ''}
            </p>
          ) : null}
        </section>
        <section className="scores">
          <h2>G1 Intent Precision (0–3 each, total {total ?? '—'} / 18)</h2>
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
          {unit.timepoint === 'T2' ? (
            <>
              <Likert
                label="G2 Naturalness"
                hint="Does this remain the participant's own language rather than a formulaic prompt?"
                value={naturalness}
                onChange={setNaturalness}
              />
              <Likert
                label="G4 Copying"
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
            const p = precisionTotal(precision)
            const t1coding = store.codings.find(
              (item) =>
                item.trial_id === unit.trial.trial_id &&
                item.timepoint === 'T1' &&
                item.coder_id === coderId,
            )
            const t1s = loadStore()
              .codings.filter(
                (item) =>
                  item.participant_id === unit.trial.participant_id &&
                  item.timepoint === 'T1' &&
                  item.coder_id === coderId,
              )
              .map((item) => item.precision_total)
            const coding: IntentCoding = {
              participant_id: unit.trial.participant_id,
              trial_id: unit.trial.trial_id,
              task_id: unit.trial.task_id,
              condition: unit.trial.condition,
              timepoint: unit.timepoint,
              coder_id: coderId,
              precision,
              precision_total: p,
              naturalness: unit.timepoint === 'T2' ? naturalness : null,
              copying: unit.timepoint === 'T2' ? copying : null,
              discovery_rate:
                unit.timepoint === 'T2' && t1coding
                  ? discoveryRate(t1coding.precision, precision, task.required_dimensions)
                  : null,
              learning_gain:
                unit.timepoint === 'T2' && t1coding ? learningGain(t1coding.precision_total, p) : null,
              transfer_gain: unit.timepoint === 'T3' ? transferGain(p, mean(t1s)) : null,
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
          <button
            key={n}
            type="button"
            className={value === n ? 'tick on' : 'tick'}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
