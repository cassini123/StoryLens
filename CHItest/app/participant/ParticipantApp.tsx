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
import { Button, Field, FooterBar, Likert, Shell } from '../shared/ui'

const emptyDemo: Demographics = {
  cinematography_experience: '',
  cinematography_years: '',
  visual_experience: '',
  ai_familiarity: '',
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
    t1_intent: '',
    t2_intent: '',
    t3_intent: '',
    initial_intent: '',
    initial_intent_timestamp: '',
    initial_sketch: null,
    sketch_actions: [],
    final_sketch: null,
    refined_intent: '',
    final_intent: '',
    authored: { modification_count: 0, rejection: false },
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
      demo.cinematography_experience !== '' &&
      demo.visual_experience !== '' &&
      demo.ai_familiarity !== ''

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
            <Field label="Cinematography experience">
              <select
                value={demo.cinematography_experience}
                onChange={(e) =>
                  setDemo({
                    ...demo,
                    cinematography_experience: e.target.value as ExperienceLevel | '',
                    film_background: e.target.value !== 'none',
                  })
                }
              >
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="some">Some</option>
                <option value="frequent">Frequent</option>
              </select>
            </Field>
            <Field label="Years of cinematography experience (0 if none)">
              <input
                value={demo.cinematography_years}
                onChange={(e) =>
                  setDemo({ ...demo, cinematography_years: e.target.value, film_years: e.target.value })
                }
                placeholder="0"
              />
            </Field>
            <Field label="Visual / design experience">
              <select
                value={demo.visual_experience}
                onChange={(e) =>
                  setDemo({
                    ...demo,
                    visual_experience: e.target.value as ExperienceLevel | '',
                    design_background: e.target.value !== 'none',
                  })
                }
              >
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="some">Some</option>
                <option value="frequent">Frequent</option>
              </select>
            </Field>
            <Field label="AI familiarity">
              <select
                value={demo.ai_familiarity}
                onChange={(e) =>
                  setDemo({
                    ...demo,
                    ai_familiarity: e.target.value as ExperienceLevel | '',
                    ai_experience: e.target.value as ExperienceLevel | '',
                    image_gen_experience: e.target.value as ExperienceLevel | '',
                  })
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
                condition_order: setupGroup,
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
          <p>Each task has a baseline description (T1), then a second description (T2). After all tasks, you will complete one new task with no assistance (T3).</p>
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
      <Shell title={`T3 Transfer · ${task.title}`} meta={`${session.participant_id} · Transfer`}>
        <TrialWorkspace
          taskTitle={task.title}
          taskBrief={task.brief}
          condition="transfer"
          step={step === 'transfer_task' ? 'trial_task' : 'trial_intent'}
          initialValue={session.runtime.draft_initial}
          finalValue=""
          scene={null}
          prompt={experiment.prompts.transfer}
          t1Prompt={experiment.prompts.transfer}
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
                    timestamps: { ...trial.timestamps, task_start: trial.timestamps.task_start ?? nowIso(), t3_start: nowIso(), intent_start: nowIso() },
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
                t1_intent: '',
                t2_intent: '',
                t3_intent: text,
                initial_intent: text,
                initial_intent_timestamp: nowIso(),
                final_intent: text,
                refined_intent: text,
                timestamps: {
                  ...trial.timestamps,
                  intent_submit: nowIso(),
                  t3_submit: nowIso(),
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
      subtitle={`${step === 'trial_intent' ? 'T1 Baseline' : step === 'trial_sketch' ? 'T2 Sketch' : step === 'trial_refine' ? 'T2' : 'Task'} · ${trial_index + 1} of ${total}`}
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
        t1Prompt={experiment.prompts.t1}
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
            authored: action
              ? {
                  modification_count: trial.sketch_actions.length + 1,
                  rejection: true,
                }
              : trial.authored,
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
                authored: {
                  modification_count: trial.sketch_actions.length,
                  rejection: trial.sketch_actions.length > 0,
                },
                timestamps: { ...trial.timestamps, sketch_confirm: nowIso(), refinement_start: nowIso(), t2_start: nowIso() },
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
                    t1_start: nowIso(),
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
                  t1_intent: text,
                  initial_intent: text,
                  initial_intent_timestamp: nowIso(),
                  timestamps: { ...trial.timestamps, intent_submit: nowIso(), t1_submit: nowIso() },
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
                    timestamps: { ...nextTrial.timestamps, refinement_start: nowIso(), t2_start: nowIso() },
                  }),
                  runtime: { ...withTrial.runtime, step: 'trial_refine', draft_final: '' },
                })
                return
              }
              const text = withTrial.runtime.draft_final.trim()
              const finished: Trial = {
                ...trial,
                t2_intent: text,
                final_intent: text,
                refined_intent: text,
                timestamps: {
                  ...trial.timestamps,
                  refinement_start: trial.timestamps.refinement_start ?? nowIso(),
                  refinement_submit: nowIso(),
                  t2_submit: nowIso(),
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
  t1Prompt,
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
  t1Prompt: string
  onInitialChange: (value: string) => void
  onFinalChange: (value: string) => void
  onSketchChange: (scene: SketchScene, action?: SketchAction) => void
}) {
  const showTask = step === 'trial_task' || step === 'transfer_task'
  const intentActive = step === 'trial_intent' || step === 'transfer_intent'
  const sketchActive = step === 'trial_sketch'
  const refineActive = step === 'trial_refine'
  const showSketch = condition === 'sketch' && (sketchActive || refineActive || Boolean(scene))
  const isTransfer = condition === 'transfer'

  if (showTask) {
    return (
      <main className="page">
        <p className="kicker">{isTransfer ? 'T3 Transfer' : 'T1 Baseline'} · {taskTitle}</p>
        <p className="lead">{taskBrief}</p>
        <p>Design a single shot. Do not write a story or a full screenplay.</p>
      </main>
    )
  }

  return (
    <main className="workspace">
      <section>
        <h2>{isTransfer ? 'T3 Intent' : 'T1 Intent'}</h2>
        {intentActive ? <p className="hint">{t1Prompt}</p> : null}
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
          <div className="empty-sketch">Sketch appears after you submit your T1 description.</div>
        )}
      </section>
      <section>
        <h2>T2 Intent</h2>
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
          <div className="empty-sketch">You will re-express your intent after T1{condition === 'sketch' ? ' and the sketch' : ''}.</div>
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
