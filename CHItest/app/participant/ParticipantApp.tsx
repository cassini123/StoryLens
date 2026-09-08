import { useEffect, useMemo, useState } from 'react'
import { experiment, getImage, stimulusUrl, STUDY_TITLE } from '../shared/config'
import { saveGeneratedImage, getGeneratedImage } from '../shared/imageStore'
import { checkJimengHealth, generateImageFromIntent, type JimengHealth } from '../shared/jimeng'
import { generateSketch, makeSketchRecord } from '../shared/sketch/generate'
import { SceneEditor } from '../shared/sketch/SceneEditor'
import { SemanticPanel } from '../shared/sketch/SemanticPanel'
import { SceneView } from '../shared/sketch/SceneView'
import { buildTrialPlan, nextGroupId, nextParticipantId } from '../shared/schedule'
import { downloadParticipantPacket } from '../shared/export'
import { getActiveSession, getSession, loadStore, upsertSession } from '../shared/store'
import { nowIso } from '../shared/time'
import type {
  Condition,
  Demographics,
  ExperienceLevel,
  GroupId,
  ImageDef,
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

function emptyTrial(
  participantId: string,
  imageId: string,
  condition: Condition,
  phase: Trial['phase'],
): Trial {
  return {
    participant_id: participantId,
    trial_id: `${participantId}_${imageId}_${phase}`,
    task_id: imageId,
    image_id: imageId,
    phase,
    condition,
    t1_intent: '',
    t2_intent: '',
    t3_intent: '',
    initial_intent: '',
    initial_intent_timestamp: '',
    refined_intent: '',
    refined_intent_timestamp: '',
    generated_image: null,
    initial_sketch: null,
    sketch_actions: [],
    final_sketch: null,
    semantic_confirms: [],
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
  const plan = buildTrialPlan(session.group_id, session.participant_id)
  const planned = plan[index]
  const existing = session.trials.find((item) => item.trial_id === `${session.participant_id}_${planned.image_id}_${planned.phase}`)
  if (existing) return { session, trial: existing }
  const trial = emptyTrial(session.participant_id, planned.image_id, planned.condition, planned.phase)
  return { session: persist({ ...session, trials: [...session.trials, trial] }), trial }
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
  const [health, setHealth] = useState<JimengHealth | null>(null)

  useEffect(() => {
    void checkJimengHealth().then(setHealth)
  }, [])

  if (!session) {
    const ready =
      setupId.trim().length > 0 &&
      demo.cinematography_experience !== '' &&
      demo.visual_experience !== '' &&
      demo.ai_familiarity !== ''

    return (
      <Shell title="Participant setup" subtitle={STUDY_TITLE}>
        <main className="page">
          <p className="lead">Start a new session. Do not reuse a participant ID.</p>
          {health && !health.credentials ? (
            <p className="api-status bad">
              {health.error || 'Jimeng API is not configured. Generated images will be placeholders until Vercel Production has JIMENG_ACCESS_KEY and JIMENG_SECRET_KEY and is Redeployed.'}
            </p>
          ) : null}
          <div className="stack">
            <Field label="Participant ID">
              <input value={setupId} onChange={(e) => setSetupId(e.target.value.trim())} />
            </Field>
            <Field label="Condition order">
              <select value={setupGroup} onChange={(e) => setSetupGroup(e.target.value as GroupId)}>
                <option value="direct_first">T1 → Direct → Sketch → T3</option>
                <option value="sketch_first">T1 → Sketch → Direct → T3</option>
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
                  generate_error: '',
                  selected_node_id: null,
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
  const plan = buildTrialPlan(session.group_id, session.participant_id)
  const { step, trial_index } = session.runtime
  const update = (next: Session) => setSession(persist(next))

  if (step === 'intro') {
    return (
      <Shell title="Introduction" meta={session.participant_id}>
        <main className="page">
          <p className="lead">{experiment.prompts.introduction}</p>
          <p>You will complete 6 images: 2 baseline, 1 Direct, 1 Sketch, then 2 transfer images.</p>
        </main>
        <FooterBar>
          <Button
            fill
            onClick={() => {
              const ready = ensureTrial(session, 0)
              update({
                ...ready.session,
                runtime: { ...ready.session.runtime, step: 'show_image', trial_index: 0 },
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
          <p className="lead">Thank you. Please download your session data and give the file to the experimenter.</p>
          <div className="stack">
            <Button fill onClick={() => void downloadParticipantPacket(session)}>
              Download my session data
            </Button>
          </div>
        </main>
        <FooterBar>
          <Button onClick={() => (window.location.hash = '#/')}>Home</Button>
        </FooterBar>
      </Shell>
    )
  }

  const { session: withTrial, trial } = ensureTrial(session, trial_index)
  const image = getImage(trial.image_id)
  const total = plan.length

  function gotoNext(current: Session) {
    const nextIndex = trial_index + 1
    if (nextIndex >= plan.length) {
      update({
        ...current,
        runtime: {
          step: 'questionnaire',
          trial_index: nextIndex,
          draft_initial: '',
          draft_final: '',
          working_scene: null,
          generate_error: '',
          selected_node_id: null,
        },
      })
      return
    }
    const ready = ensureTrial(current, nextIndex)
    update({
      ...ready.session,
      runtime: {
        step: 'show_image',
        trial_index: nextIndex,
        draft_initial: '',
        draft_final: '',
        working_scene: null,
        generate_error: '',
        selected_node_id: null,
      },
    })
  }

  async function runGeneration(currentTrial: Trial, currentSession: Session) {
    const generating: Trial = {
      ...currentTrial,
      timestamps: { ...currentTrial.timestamps, generate_start: nowIso() },
    }
    update({
      ...replaceTrial(currentSession, generating),
      runtime: { ...currentSession.runtime, step: 'generating', generate_error: '' },
    })
    const result = await generateImageFromIntent(currentTrial.initial_intent)
    await saveGeneratedImage(currentTrial.trial_id, result.data_url)
    let nextTrial: Trial = {
      ...generating,
      generated_image: result.meta,
      timestamps: { ...generating.timestamps, generate_done: nowIso() },
    }
    if (currentTrial.condition === 'sketch') {
      const record = generateSketch(currentTrial.image_id, currentTrial.initial_intent)
      nextTrial = {
        ...nextTrial,
        initial_sketch: record,
        timestamps: { ...nextTrial.timestamps, sketch_generated: record.generation_timestamp },
      }
      update({
        ...replaceTrial(currentSession, nextTrial),
        runtime: {
          ...currentSession.runtime,
          step: 'view_feedback',
          working_scene: record.output.scene,
          generate_error: result.meta.error,
        },
      })
      return
    }
    update({
      ...replaceTrial(currentSession, nextTrial),
      runtime: {
        ...currentSession.runtime,
        step: 'view_feedback',
        working_scene: null,
        generate_error: result.meta.error,
      },
    })
  }

  const phaseLabel =
    trial.phase === 'T1' ? 'T1 Baseline' : trial.phase === 'T3' ? 'T3 Transfer' : trial.condition === 'sketch' ? 'T2 Sketch' : 'T2 Direct'

  return (
    <Shell title={image.title} subtitle={`${phaseLabel} · ${trial_index + 1} of ${total}`} meta={session.participant_id}>
      <TrialWorkspace
        image={image}
        trial={trial}
        step={step}
        initialValue={step === 'initial_intent' ? withTrial.runtime.draft_initial : trial.initial_intent}
        finalValue={withTrial.runtime.draft_final}
        scene={withTrial.runtime.working_scene}
        selectedNodeId={withTrial.runtime.selected_node_id}
        generateError={withTrial.runtime.generate_error}
        prompt={
          trial.condition === 'sketch'
            ? experiment.prompts.sketch_refine
            : trial.phase === 'T3'
              ? experiment.prompts.transfer
              : experiment.prompts.direct_refine
        }
        t1Prompt={experiment.prompts.t1}
        onInitialChange={(value) =>
          update({ ...withTrial, runtime: { ...withTrial.runtime, draft_initial: value } })
        }
        onFinalChange={(value) =>
          update({ ...withTrial, runtime: { ...withTrial.runtime, draft_final: value } })
        }
        onSelectNode={(id) =>
          update({ ...withTrial, runtime: { ...withTrial.runtime, selected_node_id: id } })
        }
        onConfirmRelation={(relation) => {
          const nextTrial: Trial = {
            ...trial,
            semantic_confirms: [
              ...trial.semantic_confirms,
              { timestamp: nowIso(), node_id: withTrial.runtime.selected_node_id || '', relation },
            ],
          }
          update(replaceTrial(withTrial, nextTrial))
        }}
        onSketchChange={(scene, action) => {
          const first =
            trial.timestamps.sketch_first_interaction ?? (action ? nowIso() : trial.timestamps.sketch_first_interaction)
          const nextTrial: Trial = {
            ...trial,
            sketch_actions: action ? [...trial.sketch_actions, action] : trial.sketch_actions,
            authored: action
              ? { modification_count: trial.sketch_actions.length + 1, rejection: true }
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
        <Button
          fill
          disabled={
            (step === 'initial_intent' && withTrial.runtime.draft_initial.trim().length === 0) ||
            (step === 'refined_intent' && withTrial.runtime.draft_final.trim().length === 0) ||
            step === 'generating'
          }
          onClick={() => {
            if (step === 'show_image') {
              const started: Trial = {
                ...trial,
                timestamps: {
                  ...trial.timestamps,
                  task_start: trial.timestamps.task_start ?? nowIso(),
                  intent_start: nowIso(),
                  ...(trial.phase === 'T1' ? { t1_start: nowIso() } : {}),
                  ...(trial.phase === 'T3' ? { t3_start: nowIso() } : {}),
                },
              }
              update({
                ...replaceTrial(withTrial, started),
                runtime: { ...withTrial.runtime, step: 'initial_intent', draft_initial: '' },
              })
              return
            }
            if (step === 'initial_intent') {
              const text = withTrial.runtime.draft_initial.trim()
              const nextTrial: Trial = {
                ...trial,
                initial_intent: text,
                initial_intent_timestamp: nowIso(),
                t1_intent: trial.phase === 'T1' ? text : trial.t1_intent,
                timestamps: { ...trial.timestamps, intent_submit: nowIso(), t1_submit: nowIso() },
              }
              void runGeneration(nextTrial, replaceTrial(withTrial, nextTrial))
              return
            }
            if (step === 'view_feedback') {
              let nextTrial = trial
              if (trial.condition === 'sketch' && withTrial.runtime.working_scene) {
                nextTrial = {
                  ...trial,
                  final_sketch: makeSketchRecord(withTrial.runtime.working_scene),
                  authored: {
                    modification_count: trial.sketch_actions.length,
                    rejection: trial.sketch_actions.length > 0,
                  },
                  timestamps: {
                    ...trial.timestamps,
                    sketch_confirm: nowIso(),
                    refinement_start: nowIso(),
                    t2_start: nowIso(),
                  },
                }
              } else {
                nextTrial = {
                  ...trial,
                  timestamps: {
                    ...trial.timestamps,
                    refinement_start: nowIso(),
                    t2_start: nowIso(),
                  },
                }
              }
              update({
                ...replaceTrial(withTrial, nextTrial),
                runtime: { ...withTrial.runtime, step: 'refined_intent', draft_final: '' },
              })
              return
            }
            const text = withTrial.runtime.draft_final.trim()
            const finished: Trial = {
              ...trial,
              refined_intent: text,
              refined_intent_timestamp: nowIso(),
              final_intent: text,
              t2_intent: trial.phase === 'T3' ? trial.t2_intent : text,
              t3_intent: trial.phase === 'T3' ? text : trial.t3_intent,
              timestamps: {
                ...trial.timestamps,
                refinement_submit: nowIso(),
                t2_submit: trial.phase === 'T3' ? trial.timestamps.t2_submit : nowIso(),
                t3_submit: trial.phase === 'T3' ? nowIso() : trial.timestamps.t3_submit,
                trial_end: nowIso(),
              },
            }
            gotoNext(replaceTrial(withTrial, finished))
          }}
        >
          {step === 'generating' ? 'Generating…' : 'Continue'}
        </Button>
      </FooterBar>
    </Shell>
  )
}

function TrialWorkspace({
  image,
  trial,
  step,
  initialValue,
  finalValue,
  scene,
  selectedNodeId,
  generateError,
  prompt,
  t1Prompt,
  onInitialChange,
  onFinalChange,
  onSketchChange,
  onSelectNode,
  onConfirmRelation,
}: {
  image: ImageDef
  trial: Trial
  step: Session['runtime']['step']
  initialValue: string
  finalValue: string
  scene: SketchScene | null
  selectedNodeId: string | null
  generateError: string
  prompt: string
  t1Prompt: string
  onInitialChange: (value: string) => void
  onFinalChange: (value: string) => void
  onSketchChange: (scene: SketchScene, action?: SketchAction) => void
  onSelectNode: (id: string | null) => void
  onConfirmRelation: (relation: string) => void
}) {
  const selectedLabel =
    image.ground_truth.nodes.find((node) => node.id === selectedNodeId)?.label ??
    (selectedNodeId === 'camera' ? '镜头' : null)

  if (step === 'show_image') {
    return (
      <main className="page">
        <p className="kicker">{trial.phase} · {image.title}</p>
        <p className="lead">{image.brief}</p>
        <img className="stimulus" src={stimulusUrl(image.file)} alt={image.title} />
      </main>
    )
  }

  if (step === 'generating') {
    return (
      <main className="page">
        <p className="lead">{experiment.prompts.generating}</p>
      </main>
    )
  }

  const intentActive = step === 'initial_intent'
  const refineActive = step === 'refined_intent'
  const sketchActive = step === 'view_feedback' && trial.condition === 'sketch'
  const showSketch = trial.condition === 'sketch' && Boolean(scene)

  return (
    <main className={trial.condition === 'sketch' ? 'workspace workspace-sketch' : 'workspace'}>
      <section>
        <h2>Picture</h2>
        <img className="stimulus-small" src={stimulusUrl(image.file)} alt={image.title} />
        <h2>Your first description</h2>
        {intentActive ? <p className="hint">{t1Prompt}</p> : null}
        <textarea
          value={initialValue}
          onChange={(e) => onInitialChange(e.target.value)}
          readOnly={!intentActive}
          placeholder="Describe the shot you see."
        />
      </section>
      <section>
        <h2>Generated image</h2>
        {step === 'view_feedback' || step === 'refined_intent' ? (
          <>
            <p className="hint">{experiment.prompts.view_image}</p>
            <GeneratedImage trialId={trial.trial_id} />
            {generateError ? <p className="hint">Note: {generateError}</p> : null}
          </>
        ) : (
          <div className="empty-sketch">An AI image will appear after you submit your first description.</div>
        )}
        {showSketch ? (
          <>
            <h2>Sketch</h2>
            {sketchActive && scene ? (
              <SceneEditor scene={scene} onChange={onSketchChange} onSelect={onSelectNode} />
            ) : scene ? (
              <SceneView scene={scene} />
            ) : null}
            {sketchActive ? (
              <SemanticPanel image={image} selectedLabel={selectedLabel} onConfirm={onConfirmRelation} />
            ) : null}
          </>
        ) : trial.phase === 'T3' ? (
          <p className="hint">No sketch in transfer tasks.</p>
        ) : trial.condition !== 'sketch' ? (
          <p className="hint">No sketch in this condition.</p>
        ) : null}
      </section>
      <section>
        <h2>Revised description</h2>
        {refineActive || finalValue ? (
          <>
            <p className="hint">{prompt}</p>
            <textarea
              value={finalValue}
              onChange={(e) => onFinalChange(e.target.value)}
              readOnly={!refineActive}
              placeholder="Revise your description after seeing the generated result."
            />
          </>
        ) : (
          <div className="empty-sketch">You will revise your description after the generated image.</div>
        )}
      </section>
    </main>
  )
}

function GeneratedImage({ trialId }: { trialId: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    void getGeneratedImage(trialId).then(setSrc)
  }, [trialId])
  if (!src) return <div className="empty-sketch">Loading generated image…</div>
  return <img className="generated" src={src} alt="Generated from your description" />
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
