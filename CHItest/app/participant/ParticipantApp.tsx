import { useEffect, useMemo, useRef, useState } from 'react'
import { getImage, stageHasGeneration, stageHasSketch, stimulusUrl, STUDY_TITLE } from '../shared/config'
import { getGeneratedImage, saveGeneratedImage } from '../shared/imageStore'
import { checkJimengHealth, generateImageFromIntent, type JimengHealth } from '../shared/jimeng'
import {
  addGeneration,
  addSketchAction,
  addSketchSnapshot,
  addTextVersion,
  currentTask,
  logEvent,
} from '../shared/logging'
import { composeConditioning } from '../shared/media'
import { generateSketch } from '../shared/sketch/generate'
import { SceneEditor } from '../shared/sketch/SceneEditor'
import { sceneToSvg } from '../shared/sketch/render'
import { cloneScene } from '../shared/sketch/templates'
import { buildTaskPlan, nextParticipantId, patternForParticipant } from '../shared/schedule'
import { downloadParticipantPacket } from '../shared/export'
import { abandonSession, getActiveSession, getSession, loadStore, upsertSession } from '../shared/store'
import { nowIso } from '../shared/time'
import type {
  Demographics,
  ExperienceLevel,
  ImageDef,
  PlannedTask,
  Session,
  SessionRuntime,
  SketchEdit,
  SketchScene,
  SubjectiveRatings,
  TaskRun,
  TextType,
} from '../shared/types'
import { MAX_ROUNDS } from '../shared/types'
import { SessionChrome } from '../shared/SessionChrome'
import { useI18n } from '../shared/i18n'
import { Button, Field, FooterBar, Likert } from '../shared/ui'

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

function emptyRuntime(): SessionRuntime {
  return {
    step: 'intro',
    task_index: 0,
    round: 0,
    draft_text: '',
    working_scene: null,
    generate_error: '',
    selected_node_id: null,
    last_output_image_id: '',
    text_started: false,
    sketch_editing: false,
  }
}

function emptyTask(sessionId: string, participantId: string, planned: PlannedTask): TaskRun {
  return {
    participant_id: participantId,
    session_id: sessionId,
    task_id: planned.task_id,
    image_id: planned.image_id,
    stage: planned.stage,
    round: 0,
    rounds: [],
    initial_text_version_id: '',
    final_text_version_id: '',
    satisfied_round: null,
    started_at: '',
    ended_at: '',
    sketch_actions: [],
  }
}

function persist(session: Session): Session {
  upsertSession(session)
  return session
}

function confirmRestart(session: Session, setSession: (session: Session | null) => void, message: string): void {
  if (!confirm(message)) return
  abandonSession(session.participant_id)
  setSession(null)
  window.location.hash = '#/participant'
  window.location.reload()
}

export function ParticipantApp() {
  const { t } = useI18n()
  const existing = useMemo(() => loadStore().sessions, [])
  const [session, setSession] = useState<Session | null>(() => getActiveSession() ?? null)
  const [setupId, setSetupId] = useState(nextParticipantId(existing))
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
      <SessionChrome title={t.setupTitle} extra={STUDY_TITLE} session={null}>
        <main className="page">
          <p className="lead">{t.setupLead}</p>
          {health && !health.credentials ? (
            <p className="api-status bad">
              {health.error || t.apiMissing}
            </p>
          ) : null}
          <div className="stack">
            <Field label={t.participantId}>
              <input value={setupId} onChange={(e) => setSetupId(e.target.value.trim())} />
            </Field>
            <Field label={t.cineExp}>
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
                <option value="">{t.select}</option>
                <option value="none">{t.none}</option>
                <option value="some">{t.some}</option>
                <option value="frequent">{t.frequent}</option>
              </select>
            </Field>
            <Field label={t.cineYears}>
              <input
                value={demo.cinematography_years}
                onChange={(e) => setDemo({ ...demo, cinematography_years: e.target.value, film_years: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label={t.visualExp}>
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
                <option value="">{t.select}</option>
                <option value="none">{t.none}</option>
                <option value="some">{t.some}</option>
                <option value="frequent">{t.frequent}</option>
              </select>
            </Field>
            <Field label={t.aiFam}>
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
                <option value="">{t.select}</option>
                <option value="none">{t.none}</option>
                <option value="some">{t.some}</option>
                <option value="frequent">{t.frequent}</option>
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
                alert(t.idUsed)
                return
              }
              const prior = getSession(id)
              if (prior && !prior.completed_at) {
                setSession(prior)
                return
              }
              const sessionId = `S${id.replace(/^P/i, '')}`
              const plan = buildTaskPlan(id)
              const created: Session = {
                participant_id: id,
                session_id: sessionId,
                assignment_pattern: patternForParticipant(id),
                demographics: demo,
                tasks: plan.map((item) => emptyTask(sessionId, id, item)),
                event_log: [],
                text_versions: [],
                generations: [],
                sketch_snapshots: [],
                subjective: null,
                started_at: nowIso(),
                completed_at: null,
                runtime: emptyRuntime(),
                seq: 0,
              }
              logEvent(created, 'session_start')
              logEvent(created, 'participant_setup_complete')
              setSession(persist(created))
            }}
          >
            {t.continue}
          </Button>
        </FooterBar>
      </SessionChrome>
    )
  }

  return <ParticipantFlow session={session} setSession={setSession} />
}

function ParticipantFlow({
  session,
  setSession,
}: {
  session: Session
  setSession: (session: Session | null) => void
}) {
  const { t } = useI18n()
  const changeTimer = useRef<number | null>(null)

  function update(mutator: (next: Session) => void) {
    const next = structuredClone(session)
    mutator(next)
    setSession(persist(next))
  }

  useEffect(() => {
    const onExit = () => {
      const next = structuredClone(session)
      logEvent(next, 'page_exit', { visibility: document.visibilityState })
      persist(next)
    }
    window.addEventListener('beforeunload', onExit)
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return
      onExit()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('beforeunload', onExit)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [session.session_id])

  const task = currentTask(session)
  const planLength = session.tasks.length

  if (session.runtime.step === 'intro') {
    return (
      <SessionChrome
        session={session}
        title={t.introTitle}
        extra={session.participant_id}
        onSessionChange={setSession}
      >
        <main className="page">
          <p className="lead">{t.introduction}</p>
          <p>{t.introCount}</p>
        </main>
        <FooterBar style={{ justifyContent: 'space-between' }}>
          <Button onClick={() => confirmRestart(session, setSession, t.restartConfirm)}>{t.startOver}</Button>
          <Button fill onClick={() => startTask(0)}>
            {t.continue}
          </Button>
        </FooterBar>
      </SessionChrome>
    )
  }

  if (session.runtime.step === 'questionnaire') {
    return (
      <Questionnaire
        session={session}
        onSessionChange={setSession}
        onChange={(subjective) => update((next) => { next.subjective = subjective })}
        onRestart={() => confirmRestart(session, setSession, t.restartConfirm)}
        onSubmit={() =>
          update((next) => {
            next.completed_at = nowIso()
            next.runtime.step = 'complete'
            logEvent(next, 'session_end')
          })
        }
      />
    )
  }

  if (session.runtime.step === 'complete') {
    return (
      <SessionChrome
        session={session}
        title={t.completeTitle}
        extra={session.participant_id}
        onSessionChange={setSession}
      >
        <main className="page">
          <p className="lead">{t.completeLead}</p>
          <div className="stack">
            <Button fill onClick={() => void downloadParticipantPacket(session)}>
              {t.downloadData}
            </Button>
          </div>
        </main>
        <FooterBar style={{ justifyContent: 'space-between' }}>
          <Button onClick={() => confirmRestart(session, setSession, t.restartConfirm)}>{t.startOver}</Button>
          <Button onClick={() => (window.location.hash = '#/')}>{t.home}</Button>
        </FooterBar>
      </SessionChrome>
    )
  }

  if (!task) {
    return (
      <SessionChrome session={session} title={t.error} onSessionChange={setSession}>
        <main className="page">
          <p>{t.noTask}</p>
        </main>
      </SessionChrome>
    )
  }

  const image = getImage(task.image_id)
  const lastGen = [...session.generations].reverse().find((item) => item.task_id === task.task_id)
  const canGenerate = stageHasGeneration(task.stage) && session.runtime.round < MAX_ROUNDS && session.runtime.step !== 'generating'
  const canSatisfy =
    task.stage === 'T0'
      ? session.runtime.draft_text.trim().length > 0
      : session.generations.some((item) => item.task_id === task.task_id)

  function startTask(index: number) {
    update((next) => {
      next.runtime.task_index = index
      next.runtime.round = 0
      next.runtime.draft_text = ''
      next.runtime.working_scene = null
      next.runtime.generate_error = ''
      next.runtime.last_output_image_id = ''
      next.runtime.text_started = false
      next.runtime.sketch_editing = false
      next.runtime.step = 'describe'
      const active = next.tasks[index]
      if (active && !active.started_at) active.started_at = nowIso()
      logEvent(next, 'task_start')
      logEvent(next, `${active.stage}_task_start`)
      logEvent(next, 'image_view_start')
    })
  }

  function saveDraftText(next: Session, type: TextType) {
    const text = next.runtime.draft_text.trim()
    const taskNow = currentTask(next)
    if (!taskNow) return null
    const previous = [...next.text_versions].reverse().find((item) => item.task_id === taskNow.task_id)
    const version = addTextVersion(next, text, type, previous?.text_version_id || '')
    if (!taskNow.initial_text_version_id) taskNow.initial_text_version_id = version.text_version_id
    taskNow.final_text_version_id = version.text_version_id
    logEvent(next, type === 'initial' ? 'initial_text_submit' : 'text_submit', {
      text_version_id: version.text_version_id,
      text_length: version.text_length,
    })
    return version
  }

  function finishTask() {
    update((next) => {
      const active = currentTask(next)
      if (!active) return
      if (next.runtime.draft_text.trim()) saveDraftText(next, 'final')
      active.ended_at = nowIso()
      if (stageHasGeneration(active.stage)) {
        active.satisfied_round = active.satisfied_round ?? next.runtime.round
        logEvent(next, 'satisfied_click', { round: next.runtime.round })
      }
      logEvent(next, 'image_view_end')
      logEvent(next, 'task_end')
      logEvent(next, `${active.stage}_task_complete`)
      logEvent(next, 'next_task_click')
      const nextIndex = next.runtime.task_index + 1
      if (nextIndex >= next.tasks.length) {
        next.runtime.step = 'questionnaire'
        return
      }
      next.runtime.task_index = nextIndex
      next.runtime.round = 0
      next.runtime.draft_text = ''
      next.runtime.working_scene = null
      next.runtime.generate_error = ''
      next.runtime.last_output_image_id = ''
      next.runtime.text_started = false
      next.runtime.sketch_editing = false
      next.runtime.step = 'describe'
      const upcoming = next.tasks[nextIndex]
      if (upcoming && !upcoming.started_at) upcoming.started_at = nowIso()
      logEvent(next, 'task_start')
      logEvent(next, `${upcoming.stage}_task_start`)
      logEvent(next, 'image_view_start')
    })
  }

  function openSketch() {
    update((next) => {
      const active = currentTask(next)
      if (!active) return
      saveDraftText(next, 'initial')
      const record = generateSketch(active.image_id, next.runtime.draft_text)
      next.runtime.working_scene = record.output.scene
      const snap = addSketchSnapshot(next, record.output.scene, record.output.svg, 'initial')
      logEvent(next, 'sketch_open', { snapshot_id: snap.snapshot_id })
      logEvent(next, 'sketch_snapshot_created', { snapshot_id: snap.snapshot_id, kind: 'initial' })
      next.runtime.step = 'sketch_edit'
    })
  }

  async function runGenerate() {
    const text = session.runtime.draft_text.trim()
    if (!text) return
    const live = structuredClone(session)
    const active = currentTask(live)
    if (!active) return
    const nextRound = Math.min(MAX_ROUNDS, live.runtime.round + 1)
    live.runtime.round = nextRound
    active.round = nextRound
    logEvent(live, 'generate_click')
    logEvent(live, 'round_start', { round: nextRound })
    saveDraftText(live, nextRound === 1 ? 'initial' : 'refined')
    if (live.runtime.working_scene) {
      addSketchSnapshot(live, live.runtime.working_scene, sceneToSvg(live.runtime.working_scene), 'before')
    }
    live.runtime.step = 'generating'
    live.runtime.generate_error = ''
    const started = nowIso()
    logEvent(live, 'generation_start')
    persist(live)
    setSession(live)

    const sketchSvg = live.runtime.working_scene ? sceneToSvg(live.runtime.working_scene) : null
    const sketchSnap = live.runtime.working_scene
      ? addSketchSnapshot(live, live.runtime.working_scene, sketchSvg || '', 'generation')
      : null
    let images: string[] = []
    try {
      const originalUrl = stimulusUrl(getImage(active.image_id).image_path)
      const composed = await composeConditioning(originalUrl, stageHasSketch(active.stage) ? sketchSvg : null)
      images = [composed]
    } catch (error) {
      logEvent(live, 'error', { where: 'compose', message: String(error) })
    }
    const result = await generateImageFromIntent(text, undefined, images)
    const ended = nowIso()
    const success = result.meta.status === 'done'
    const generation = addGeneration(live, {
      task_id: active.task_id,
      stage: active.stage,
      round: live.runtime.round,
      timestamp_start: started,
      timestamp_end: ended,
      latency_ms: Math.max(0, Date.parse(ended) - Date.parse(started)),
      model: result.meta.engine,
      model_version: 'jimeng_t2i_v40',
      input_image_id: active.image_id,
      input_text: text,
      input_text_version_id: active.final_text_version_id,
      input_sketch_snapshot_id: sketchSnap?.snapshot_id || '',
      output_image_id: '',
      success,
      error: result.meta.error,
      meta: result.meta,
    })
    generation.output_image_id = generation.generation_id
    await saveGeneratedImage(generation.generation_id, result.data_url)
    live.runtime.last_output_image_id = generation.generation_id
    live.runtime.generate_error = result.meta.error
    live.runtime.step = 'review'
    active.rounds.push({
      round: live.runtime.round,
      text_version_id: active.final_text_version_id,
      generation_id: generation.generation_id,
      sketch_snapshot_before_id: sketchSnap?.snapshot_id || '',
      sketch_snapshot_after_id: sketchSnap?.snapshot_id || '',
      started_at: started,
      ended_at: ended,
    })
    logEvent(live, 'generation_end', {
      generation_id: generation.generation_id,
      success,
      latency_ms: generation.latency_ms,
    })
    logEvent(live, success ? 'generation_success' : 'generation_failure', { error: result.meta.error })
    logEvent(live, 'round_end', { round: live.runtime.round })
    logEvent(live, 'generated_image_view')
    logEvent(live, 'generated_image_view_start')
    persist(live)
    setSession(structuredClone(live))
  }

  function onTextChange(value: string) {
    update((next) => {
      if (!next.runtime.text_started && value.trim()) {
        next.runtime.text_started = true
        logEvent(next, 'text_input_start')
      }
      next.runtime.draft_text = value
    })
    if (changeTimer.current) window.clearTimeout(changeTimer.current)
    changeTimer.current = window.setTimeout(() => {
      const latest = getSession(session.participant_id)
      if (!latest) return
      logEvent(latest, 'text_change', { text_length: latest.runtime.draft_text.length })
      persist(latest)
    }, 800)
  }

  function onSketchChange(scene: SketchScene, action?: SketchEdit) {
    update((next) => {
      if (!next.runtime.sketch_editing) {
        next.runtime.sketch_editing = true
        logEvent(next, 'sketch_edit_start')
      }
      next.runtime.working_scene = cloneScene(scene)
      if (action) {
        addSketchAction(next, action.action_type || action.action, action.target_id, action.before_state, action.after_state)
      }
    })
  }

  const generating = session.runtime.step === 'generating'
  const showSketch = stageHasSketch(task.stage) && Boolean(session.runtime.working_scene)
  const prompt = session.runtime.step === 'review' ? t.refine : t.observe

  return (
    <SessionChrome
      session={session}
      title={`${task.stage} · ${session.runtime.task_index + 1}/${planLength}`}
      extra={generating ? t.generating : session.participant_id}
      onSessionChange={setSession}
    >
      {generating ? (
        <main className="page">
          <p className="lead">{t.generating}</p>
        </main>
      ) : (
        <TaskWorkspace
          image={image}
          stage={task.stage}
          round={session.runtime.round}
          text={session.runtime.draft_text}
          prompt={prompt}
          scene={session.runtime.working_scene}
          showSketch={showSketch}
          lastGenerationId={lastGen?.generation_id || session.runtime.last_output_image_id}
          generateError={session.runtime.generate_error}
          onTextFocus={() => update((next) => { logEvent(next, 'text_focus') })}
          onTextChange={onTextChange}
          onSketchChange={onSketchChange}
          onSelect={(id) =>
            update((next) => {
              next.runtime.selected_node_id = id
              logEvent(next, 'sketch_select', { target_id: id })
            })
          }
        />
      )}
      <FooterBar style={{ justifyContent: 'space-between' }}>
        <Button onClick={() => confirmRestart(session, setSession, t.restartConfirm)}>{t.startOver}</Button>
        <div className="stack-row">
          {task.stage === 'T0' ? (
            <Button fill disabled={!canSatisfy} onClick={finishTask}>
              {t.submit}
            </Button>
          ) : null}
          {task.stage !== 'T0' && session.runtime.step === 'describe' && stageHasSketch(task.stage) ? (
            <Button fill disabled={session.runtime.draft_text.trim().length === 0} onClick={openSketch}>
              {t.continue}
            </Button>
          ) : null}
          {task.stage !== 'T0' && session.runtime.step === 'describe' && !stageHasSketch(task.stage) ? (
            <Button fill disabled={session.runtime.draft_text.trim().length === 0 || !canGenerate} onClick={() => void runGenerate()}>
              {t.generate}
            </Button>
          ) : null}
          {(session.runtime.step === 'sketch_edit' || session.runtime.step === 'review') && canGenerate ? (
            <Button fill disabled={session.runtime.draft_text.trim().length === 0} onClick={() => void runGenerate()}>
              {t.generate}{session.runtime.round > 0 ? ` (${session.runtime.round}/${MAX_ROUNDS})` : ''}
            </Button>
          ) : null}
          {task.stage !== 'T0' && canSatisfy ? (
            <Button onClick={finishTask}>{t.satisfied}</Button>
          ) : null}
        </div>
      </FooterBar>
    </SessionChrome>
  )
}

function TaskWorkspace({
  image,
  stage,
  round,
  text,
  prompt,
  scene,
  showSketch,
  lastGenerationId,
  generateError,
  onTextFocus,
  onTextChange,
  onSketchChange,
  onSelect,
}: {
  image: ImageDef
  stage: TaskRun['stage']
  round: number
  text: string
  prompt: string
  scene: SketchScene | null
  showSketch: boolean
  lastGenerationId: string
  generateError: string
  onTextFocus: () => void
  onTextChange: (value: string) => void
  onSketchChange: (scene: SketchScene, action?: SketchEdit) => void
  onSelect: (id: string | null) => void
}) {
  const columns = stage === 'T0' ? 'workspace-t0' : showSketch ? 'workspace-t2' : 'workspace-t1'
  const { t, format } = useI18n()
  return (
    <main className={`workspace ${columns}`}>
      <section>
        <h2>{t.original}</h2>
        <img className="stimulus-small" src={stimulusUrl(image.image_path)} alt="" />
      </section>
      {showSketch && scene ? (
        <section>
          <h2>{t.sketch}</h2>
          <SceneEditor scene={scene} onChange={onSketchChange} onSelect={onSelect} />
        </section>
      ) : null}
      {stage !== 'T0' ? (
        <section>
          <h2>{t.generated}</h2>
          {lastGenerationId ? (
            <GeneratedImage trialId={lastGenerationId} />
          ) : (
            <div className="empty-sketch">{t.emptyGenerated}</div>
          )}
          {generateError ? <p className="hint">{generateError}</p> : null}
          {round > 0 ? <p className="hint">{format(t.round, { n: round, max: MAX_ROUNDS })}</p> : null}
        </section>
      ) : null}
      <section className="desc-pane">
        <h2>{t.description}</h2>
        <p className="hint">{prompt}</p>
        <textarea
          value={text}
          onFocus={onTextFocus}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder=""
        />
      </section>
    </main>
  )
}

function GeneratedImage({ trialId }: { trialId: string }) {
  const { t } = useI18n()
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    void getGeneratedImage(trialId).then(setSrc)
  }, [trialId])
  if (!src) return <div className="empty-sketch">{t.loadingGenerated}</div>
  return <img className="generated" src={src} alt="" />
}

function Questionnaire({
  session,
  onChange,
  onRestart,
  onSubmit,
  onSessionChange,
}: {
  session: Session
  onChange: (value: SubjectiveRatings) => void
  onRestart: () => void
  onSubmit: () => void
  onSessionChange: (session: Session) => void
}) {
  const { t } = useI18n()
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
    <SessionChrome
      session={session}
      title={t.questionnaireTitle}
      extra={session.participant_id}
      onSessionChange={onSessionChange}
    >
      <main className="page">
        <p className="lead">{t.questionnaireLead}</p>
        <Likert
          label={t.control}
          hint={t.controlHint}
          value={value.perceived_control}
          onChange={(n) => onChange({ ...value, perceived_control: n })}
        />
        <Likert
          label={t.usefulness}
          hint={t.usefulnessHint}
          value={value.perceived_usefulness}
          onChange={(n) => onChange({ ...value, perceived_usefulness: n })}
        />
        <Likert
          label={t.effort}
          hint={t.effortHint}
          value={value.cognitive_effort}
          onChange={(n) => onChange({ ...value, cognitive_effort: n })}
        />
        <Likert
          label={t.confidence}
          hint={t.confidenceHint}
          value={value.confidence}
          onChange={(n) => onChange({ ...value, confidence: n })}
        />
      </main>
      <FooterBar style={{ justifyContent: 'space-between' }}>
        <Button onClick={onRestart}>{t.startOver}</Button>
        <Button fill disabled={!ready} onClick={onSubmit}>
          {t.submit}
        </Button>
      </FooterBar>
    </SessionChrome>
  )
}
