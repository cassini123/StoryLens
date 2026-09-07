import { useMemo, useState } from 'react'
import { experiment, getTask } from '../shared/config'
import { generateSketch, makeSketchRecord } from '../shared/sketch/generate'
import { SceneEditor } from '../shared/sketch/SceneEditor'
import { SceneView } from '../shared/sketch/SceneView'
import { buildTrialPlan, nextGroupId, nextParticipantId } from '../shared/schedule'
import { getActiveSession, getSession, loadStore, upsertSession } from '../shared/store'
import { nowIso } from '../shared/time'
import type {
  Condition,
  Demographics,
  ExperienceLevel,
  GroupId,
  Session,
  SketchAction,
  SketchScene,
  SubjectiveRatings,
  Trial,
} from '../shared/types'
import { Button, Field, FooterBar, Likert, Shell, YesNo } from '../shared/ui'

const emptyDemo: Demographics = {
  design_background: null,
  film_background: null,
  film_years: '',
  ai_experience: '',
  image_gen_experience: '',
}

function emptyTrial(participantId: string, taskId: string, condition: Condition): Trial {
  return {
    participant_id: participantId,
    trial_id: `${participantId}_${taskId}`,
    task_id: taskId,
    condition,
    initial_intent: '',
    initial_intent_timestamp: '',
    initial_sketch: null,
    sketch_actions: [],
    final_sketch: null,
    refined_intent: '',
    final_intent: '',
    timestamps: {},
  }
}

function persist(session: Session): Session {
  upsertSession(session)
  return session
}

function ensureTrial(session: Session, index: number): { session: Session; trial: Trial } {
  const plan = buildTrialPlan(session.group_id)
  const planned = plan[index]
  const existing = session.trials.find((item) => item.task_id === planned.task_id)
  if (existing) return { session, trial: existing }
  const trial = emptyTrial(session.participant_id, planned.task_id, planned.condition)
  const next = { ...session, trials: [...session.trials, trial] }
  return { session: persist(next), trial }
}

function replaceTrial(session: Session, trial: Trial): Session {
  const trials = session.trials.map((item) => (item.trial_id === trial.trial_id ? trial : item))
  const found = trials.some((item) => item.trial_id === trial.trial_id)
  return persist({ ...session, trials: found ? trials : [...trials, trial] })
}

export function ParticipantApp() {
  const existing = useMemo(() => loadStore().sessions, [])
  const [session, setSession] = useState<Session | null>(() => getActiveSession() ?? null)
  const [setupId, setSetupId] = useState(nextParticipantId(existing))
  const [setupGroup, setSetupGroup] = useState<GroupId>(nextGroupId(existing))
  const [demo, setDemo] = useState<Demographics>(emptyDemo)

  if (!session) {
    const ready =
      setupId.trim().length > 0 &&
      demo.design_background !== null &&
      demo.film_background !== null &&
      demo.ai_experience !== '' &&
      demo.image_gen_experience !== ''

    return (
      <Shell title="Participant setup" subtitle="Cinematography Expression Study">
        <main className="page">
          <p className="lead">Start a new session. Do not reuse a participant ID.</p>
          <div className="stack">
            <Field label="Participant ID">
              <input value={setupId} onChange={(e) => setSetupId(e.target.value.trim())} />
            </Field>
            <Field label="Counterbalance group">
              <select value={setupGroup} onChange={(e) => setSetupGroup(e.target.value as GroupId)}>
                {Object.keys(experiment.groups).map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </Field>
            <YesNo
              label="Design background"
              value={demo.design_background}
              onChange={(value) => setDemo({ ...demo, design_background: value })}
            />
            <YesNo
              label="Film / cinematography background"
              value={demo.film_background}
              onChange={(value) => setDemo({ ...demo, film_background: value })}
            />
            <Field label="Years of film experience (0 if none)">
              <input
                value={demo.film_years}
                onChange={(e) => setDemo({ ...demo, film_years: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="AI use experience">
              <select
                value={demo.ai_experience}
                onChange={(e) => setDemo({ ...demo, ai_experience: e.target.value as ExperienceLevel | '' })}
              >
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="some">Some</option>
                <option value="frequent">Frequent</option>
              </select>
            </Field>
            <Field label="Image generation experience">
              <select
                value={demo.image_gen_experience}
                onChange={(e) =>
                  setDemo({ ...demo, image_gen_experience: e.target.value as ExperienceLevel | '' })
                }
              >
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="some">Some</option>
                <option value="frequent">Frequent</option>
              </select>
            </Field>
          </div>
        </main>
        <FooterBar>
          <Button
            fill
            disabled={!ready}
            onClick={() => {
              const id = setupId.trim()
              if (getSession(id)?.completed_at) {
                alert('This participant ID already completed a session.')
                return
              }
              const prior = getSession(id)
              if (prior && !prior.completed_at) {
                setSession(prior)
                return
              }
              const created: Session = {
                participant_id: id,
                group_id: setupGroup,
                demographics: demo,
                trials: [],
                subjective: null,
                started_at: nowIso(),
                completed_at: null,
                runtime: {
                  step: 'intro',
                  trial_index: 0,
                  draft_initial: '',
                  draft_final: '',
                  working_scene: null,
                },
              }
              setSession(persist(created))
            }}
          >
            Continue
          </Button>
        </FooterBar>
      </Shell>
    )
  }

  return <ParticipantFlow session={session} setSession={setSession} />
}

function ParticipantFlow({
  session,
  setSession,
}: {
  session: Session
  setSession: (session: Session) => void
}) {
  const plan = buildTrialPlan(session.group_id)
  const { step, trial_index } = session.runtime
  const update = (next: Session) => setSession(persist(next))

  if (step === 'intro') {
    return (
      <Shell title="Introduction" meta={session.participant_id}>
        <main className="page">
          <p className="lead">{experiment.prompts.introduction}</p>
          <p>You will design single shots. Use everyday language. There is no need to use technical vocabulary.</p>
        </main>
        <FooterBar>
          <Button
            fill
            onClick={() => {
              const ready = ensureTrial(session, 0)
              update({
                ...ready.session,
                runtime: { ...ready.session.runtime, step: 'trial_task', trial_index: 0 },
              })
            }}
          >
            Continue
          </Button>
        </FooterBar>
      </Shell>
    )
  }

  if (step === 'questionnaire') {
    return (
      <Questionnaire
        session={session}
        onChange={(subjective) => update({ ...session, subjective })}
        onSubmit={() =>
          update({
            ...session,
            completed_at: nowIso(),
            runtime: { ...session.runtime, step: 'complete' },
          })
        }
      />
    )
  }

  if (step === 'complete') {
    return (
      <Shell title="Session complete" meta={session.participant_id}>
        <main className="page">
          <p className="lead">Thank you. Your responses have been saved on this computer.</p>
          <p>Please tell the experimenter that you have finished.</p>
        </main>
        <FooterBar>
          <Button onClick={() => (window.location.hash = '#/')}>Home</Button>
        </FooterBar>
      </Shell>
    )
  }

  if (step === 'transfer_task' || step === 'transfer_intent') {
    const task = getTask(experiment.transfer_task_id)
    const trial =
      session.trials.find((item) => item.task_id === task.id) ??
      emptyTrial(session.participant_id, task.id, 'transfer')
    return (
      <Shell title={`Transfer · ${task.title}`} meta={`${session.participant_id} · Task ${plan.length + 1} of ${plan.length + 1}`}>
        <TrialWorkspace
          taskTitle={task.title}
          taskBrief={task.brief}
          condition="transfer"
          step={step === 'transfer_task' ? 'trial_task' : 'trial_intent'}
          initialValue={session.runtime.draft_initial}
          finalValue=""
          scene={null}
          prompt={experiment.prompts.transfer}
          onInitialChange={(value) =>
            update({ ...session, runtime: { ...session.runtime, draft_initial: value } })
          }
          onFinalChange={() => undefined}
          onSketchChange={() => undefined}
        />
        <FooterBar>
          <Button
            fill
            disabled={step === 'transfer_intent' && session.runtime.draft_initial.trim().length === 0}
            onClick={() => {
              if (step === 'transfer_task') {
                const started = {
                  ...trial,
                  timestamps: { ...trial.timestamps, task_start: trial.timestamps.task_start ?? nowIso(), intent_start: nowIso() },
                }
                update({
                  ...replaceTrial(session, started),
                  runtime: { ...session.runtime, step: 'transfer_intent', draft_initial: '' },
                })
                return
              }
              const text = session.runtime.draft_initial.trim()
              const done: Trial = {
                ...trial,
                initial_intent: text,
                initial_intent_timestamp: nowIso(),
                final_intent: text,
                refined_intent: text,
                timestamps: {
                  ...trial.timestamps,
                  intent_submit: nowIso(),
                  refinement_submit: nowIso(),
                  trial_end: nowIso(),
                },
              }
              update({
                ...replaceTrial(session, done),
                runtime: {
                  ...session.runtime,
                  step: 'questionnaire',
                  draft_initial: '',
                  draft_final: '',
                  working_scene: null,
                },
              })
            }}
          >
            Continue
          </Button>
        </FooterBar>
      </Shell>
    )
  }

  const { session: withTrial, trial } = ensureTrial(session, trial_index)
  const task = getTask(trial.task_id)
  const total = plan.length

  function gotoNextTrial(current: Session) {
    const nextIndex = trial_index + 1
    if (nextIndex >= plan.length) {
      update({
        ...current,
        runtime: {
          step: 'transfer_task',
          trial_index: nextIndex,
          draft_initial: '',
          draft_final: '',
          working_scene: null,
        },
      })
      return
    }
    const ready = ensureTrial(current, nextIndex)
    update({
      ...ready.session,
      runtime: {
        step: 'trial_task',
        trial_index: nextIndex,
        draft_initial: '',
        draft_final: '',
        working_scene: null,
      },
    })
  }

  return (
    <Shell
      title={`${task.title}`}
      subtitle={`Task ${trial_index + 1} of ${total}`}
      meta={session.participant_id}
    >
      <TrialWorkspace
        taskTitle={task.title}
        taskBrief={task.brief}
        condition={trial.condition}
        step={step}
        initialValue={step === 'trial_intent' ? session.runtime.draft_initial : trial.initial_intent}
        finalValue={session.runtime.draft_final}
        scene={session.runtime.working_scene}
        prompt={trial.condition === 'sketch' ? experiment.prompts.sketch_refine : experiment.prompts.direct_refine}
        onInitialChange={(value) =>
          update({ ...withTrial, runtime: { ...withTrial.runtime, draft_initial: value } })
        }
        onFinalChange={(value) =>
          update({ ...withTrial, runtime: { ...withTrial.runtime, draft_final: value } })
        }
        onSketchChange={(scene, action) => {
          const first = trial.timestamps.sketch_first_interaction ?? (action ? nowIso() : trial.timestamps.sketch_first_interaction)
          const nextTrial: Trial = {
            ...trial,
            sketch_actions: action ? [...trial.sketch_actions, action] : trial.sketch_actions,
            timestamps: { ...trial.timestamps, sketch_first_interaction: first },
          }
          update({
            ...replaceTrial(withTrial, nextTrial),
            runtime: { ...withTrial.runtime, working_scene: scene },
          })
        }}
      />
      <FooterBar>
        {step === 'trial_sketch' ? (
          <Button
            fill
            onClick={() => {
              if (!withTrial.runtime.working_scene) return
              const confirmed: Trial = {
                ...trial,
                final_sketch: makeSketchRecord(withTrial.runtime.working_scene),
                timestamps: { ...trial.timestamps, sketch_confirm: nowIso(), refinement_start: nowIso() },
              }
              update({
                ...replaceTrial(withTrial, confirmed),
                runtime: { ...withTrial.runtime, step: 'trial_refine' },
              })
            }}
          >
            Confirm Sketch
          </Button>
        ) : (
          <Button
            fill
            disabled={
              (step === 'trial_intent' && withTrial.runtime.draft_initial.trim().length === 0) ||
              (step === 'trial_refine' && withTrial.runtime.draft_final.trim().length === 0)
            }
            onClick={() => {
              if (step === 'trial_task') {
                const started: Trial = {
                  ...trial,
                  timestamps: {
                    ...trial.timestamps,
                    task_start: trial.timestamps.task_start ?? nowIso(),
                    intent_start: nowIso(),
                  },
                }
                update({
                  ...replaceTrial(withTrial, started),
                  runtime: { ...withTrial.runtime, step: 'trial_intent', draft_initial: '' },
                })
                return
              }
              if (step === 'trial_intent') {
                const text = withTrial.runtime.draft_initial.trim()
                let nextTrial: Trial = {
                  ...trial,
                  initial_intent: text,
                  initial_intent_timestamp: nowIso(),
                  timestamps: { ...trial.timestamps, intent_submit: nowIso() },
                }
                if (trial.condition === 'sketch') {
                  const record = generateSketch(trial.task_id, text)
                  nextTrial = {
                    ...nextTrial,
                    initial_sketch: record,
                    timestamps: { ...nextTrial.timestamps, sketch_generated: record.generation_timestamp },
                  }
                  update({
                    ...replaceTrial(withTrial, nextTrial),
                    runtime: {
                      ...withTrial.runtime,
                      step: 'trial_sketch',
                      working_scene: record.output.scene,
                    },
                  })
                  return
                }
                update({
                  ...replaceTrial(withTrial, {
                    ...nextTrial,
                    timestamps: { ...nextTrial.timestamps, refinement_start: nowIso() },
                  }),
                  runtime: { ...withTrial.runtime, step: 'trial_refine', draft_final: '' },
                })
                return
              }
              const text = withTrial.runtime.draft_final.trim()
              const finished: Trial = {
                ...trial,
                final_intent: text,
                refined_intent: text,
                timestamps: {
                  ...trial.timestamps,
                  refinement_start: trial.timestamps.refinement_start ?? nowIso(),
                  refinement_submit: nowIso(),
                  trial_end: nowIso(),
                },
              }
              gotoNextTrial(replaceTrial(withTrial, finished))
            }}
          >
            Continue
          </Button>
        )}
      </FooterBar>
    </Shell>
  )
}

function TrialWorkspace({
  taskTitle,
  taskBrief,
  condition,
  step,
  initialValue,
  finalValue,
  scene,
  prompt,
  onInitialChange,
  onFinalChange,
  onSketchChange,
}: {
  taskTitle: string
  taskBrief: string
  condition: Condition
  step: Session['runtime']['step']
  initialValue: string
  finalValue: string
  scene: SketchScene | null
  prompt: string
  onInitialChange: (value: string) => void
  onFinalChange: (value: string) => void
  onSketchChange: (scene: SketchScene, action?: SketchAction) => void
}) {
  const showTask = step === 'trial_task' || step === 'transfer_task'
  const intentActive = step === 'trial_intent' || step === 'transfer_intent'
  const sketchActive = step === 'trial_sketch'
  const refineActive = step === 'trial_refine'
  const showSketch = condition === 'sketch' && (sketchActive || refineActive || Boolean(scene))

  if (showTask) {
    return (
      <main className="page">
        <p className="kicker">{taskTitle}</p>
        <p className="lead">{taskBrief}</p>
        <p>Design a single shot. Do not write a story or a full screenplay.</p>
      </main>
    )
  }

  return (
    <main className="workspace">
      <section>
        <h2>Your intent</h2>
        <textarea
          value={initialValue}
          onChange={(e) => onInitialChange(e.target.value)}
          readOnly={!intentActive}
          placeholder="Describe the shot you intend."
        />
      </section>
      <section>
        <h2>Sketch</h2>
        {condition !== 'sketch' ? (
          <div className="empty-sketch">No sketch in this condition.</div>
        ) : showSketch && scene ? (
          sketchActive ? (
            <SceneEditor scene={scene} onChange={onSketchChange} />
          ) : (
            <SceneView scene={scene} />
          )
        ) : (
          <div className="empty-sketch">Sketch appears after you submit your first description.</div>
        )}
      </section>
      <section>
        <h2>Refine</h2>
        {refineActive || finalValue ? (
          <>
            <p className="hint">{prompt}</p>
            <textarea
              value={finalValue}
              onChange={(e) => onFinalChange(e.target.value)}
              readOnly={!refineActive}
              placeholder="Describe the shot again as clearly as possible."
            />
          </>
        ) : (
          <div className="empty-sketch">You will revise your description in the next step.</div>
        )}
      </section>
    </main>
  )
}

function Questionnaire({
  session,
  onChange,
  onSubmit,
}: {
  session: Session
  onChange: (value: SubjectiveRatings) => void
  onSubmit: () => void
}) {
  const value = session.subjective ?? {
    perceived_control: null,
    perceived_usefulness: null,
    cognitive_effort: null,
    confidence: null,
  }
  const ready =
    value.perceived_control &&
    value.perceived_usefulness &&
    value.cognitive_effort &&
    value.confidence
  return (
    <Shell title="Short questionnaire" meta={session.participant_id}>
      <main className="page">
        <p className="lead">These questions are secondary. Answer based on the session as a whole.</p>
        <Likert
          label="Perceived control"
          hint="How much control did you feel over expressing your intended shot?"
          value={value.perceived_control}
          onChange={(n) => onChange({ ...value, perceived_control: n })}
        />
        <Likert
          label="Perceived usefulness"
          hint="How useful was the process for clarifying your intention?"
          value={value.perceived_usefulness}
          onChange={(n) => onChange({ ...value, perceived_usefulness: n })}
        />
        <Likert
          label="Cognitive effort"
          hint="How much mental effort did the session require?"
          value={value.cognitive_effort}
          onChange={(n) => onChange({ ...value, cognitive_effort: n })}
        />
        <Likert
          label="Confidence"
          hint="How confident are you that someone else could stage your intended shots?"
          value={value.confidence}
          onChange={(n) => onChange({ ...value, confidence: n })}
        />
      </main>
      <FooterBar>
        <Button fill disabled={!ready} onClick={onSubmit}>
          Submit
        </Button>
      </FooterBar>
    </Shell>
  )
}
