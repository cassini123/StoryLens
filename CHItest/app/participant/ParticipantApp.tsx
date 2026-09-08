import { useEffect, useMemo, useRef, useState } from 'react'
import { getImage, stageHasSketch, stimulusUrl } from '../shared/config'
import { SURPRISE_ASSET } from '../shared/surprise'
import { getGeneratedImage, saveGeneratedImage } from '../shared/imageStore'
import { checkJimengHealth, generateImageFromIntent, type JimengHealth } from '../shared/jimeng'
import {
  addGeneration,
  addSketchAction,
  addSketchSnapshot,
  addTextVersion,
  closeAutoPromptView,
  closeResultView,
  closeSketchEdit,
  closeTextEdit,
  createAutoPromptRecord,
  currentTask,
  ensureT2ProtocolSnapshots,
  finalizeAutoPrompts,
  userPromptPayload,
  logEvent,
  openAutoPromptView,
  openResultView,
  recordCopyEvent,
  recordPasteEvent,
} from '../shared/logging'
import { composeConditioning } from '../shared/media'
import { generateSketch } from '../shared/sketch/generate'
import { SceneEditor } from '../shared/sketch/SceneEditor'
import { sceneToSvg } from '../shared/sketch/render'
import { cloneScene } from '../shared/sketch/templates'
import { sceneToAutoPrompt } from '../shared/sketchToPrompt'
import { assignGroup, buildTaskPlan, groupCode, isShortSession, nextParticipantId, patternForParticipant } from '../shared/schedule'
import { createSessionBase, summarizeTask } from '../shared/sessionInit'
import { markExportReadiness } from '../shared/validation'
import { pastedFromAuto } from '../shared/textCompare'
import { downloadParticipantPacket } from '../shared/export'
import { abandonSession, getActiveSession, getSession, loadStore, upsertSession } from '../shared/store'
import { nowIso } from '../shared/time'
import type {
  Demographics,
  ExperienceLevel,
  ImageDef,
  Session,
  SketchEdit,
  SketchScene,
  SubjectiveRatings,
  TaskRun,
  TextType,
} from '../shared/types'
import { MAX_ROUNDS } from '../shared/types'
import { SessionChrome } from '../shared/SessionChrome'
import { useI18n, type Locale } from '../shared/i18n'
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

function persist(session: Session): Session {
  upsertSession(session)
  return session
}

function confirmRestart(session: Session, setSession: (session: Session | null) => void, message: string): void {
  if (!confirm(message)) return
  abandonSession(session.participant_id)
  setSession(null)
  const short = /(?:\?|&)short=1\b/.test(window.location.hash)
  window.location.hash = short ? '#/participant?short=1' : '#/participant'
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
      <SessionChrome title={t.setupTitle} extra={t.studyBrand} session={null}>
        <main className="page">
          <p className="lead">{t.setupLead}</p>
          {health && !health.credentials ? <p className="api-status bad">{t.apiMissing}</p> : null}
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
              const group = assignGroup()
              const plan = buildTaskPlan(id, group)
              const created = createSessionBase({
                participantId: id,
                sessionId,
                group,
                pattern: patternForParticipant(id),
                plan,
                demographics: demo,
                shortSession: isShortSession(),
                startedAt: nowIso(),
              })
              logEvent(created, 'session_start')
              logEvent(created, 'participant_setup_complete')
              logEvent(created, 'group_assignment', {
                group: groupCode(created.experimental_group),
                experimental_group: created.experimental_group,
                assignment_pattern: created.assignment_pattern,
                condition_order: created.condition_order,
                task_sequence_version: created.task_sequence_version,
                short_session: created.short_session,
              })
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
  const { t, locale } = useI18n()
  const changeTimer = useRef<number | null>(null)
  const sketchTimer = useRef<number | null>(null)

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
            markExportReadiness(next)
          })
        }
      />
    )
  }

  if (session.runtime.step === 'self_report') {
    return (
      <SelfReport
        session={session}
        onSessionChange={setSession}
        onRestart={() => confirmRestart(session, setSession, t.restartConfirm)}
        onChange={(selfAlignment, resultAlignment) =>
          update((next) => {
            const active = currentTask(next)
            if (!active) return
            const stamp = nowIso()
            active.self_alignment_rating = selfAlignment
            active.self_alignment_timestamp = stamp
            active.result_alignment_rating = resultAlignment
            active.result_alignment_timestamp = stamp
          })
        }
        onSubmit={() =>
          update((next) => {
            const active = currentTask(next)
            if (active) {
              logEvent(next, 'self_alignment_submit', {
                self_alignment_rating: active.self_alignment_rating,
                result_alignment_rating: active.result_alignment_rating,
              })
            }
            endCurrentTask(next)
            goToNextTask(next)
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
          <div className="complete-actions">
            <Button fill onClick={() => void downloadParticipantPacket(session)}>
              {t.downloadData}
            </Button>
            <a className="surprise-card" href={stimulusUrl(SURPRISE_ASSET)} download="surprise">
              <img src={stimulusUrl(SURPRISE_ASSET)} alt={t.surprise} />
              <span>{t.surprise}</span>
              <small>{t.surpriseHint}</small>
            </a>
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
  const canGenerate = Boolean(task.ai_enabled) && session.runtime.round < MAX_ROUNDS && session.runtime.step !== 'generating'
  const canSatisfy =
    task.stage === 'T0'
      ? session.runtime.draft_text.trim().length > 0
      : session.generations.some((item) => item.task_id === task.task_id)

  function prepareTask(next: Session, index: number) {
    next.runtime.task_index = index
    next.runtime.round = 0
    next.runtime.draft_text = ''
    next.runtime.auto_prompt = ''
    next.runtime.auto_prompt_id = ''
    next.runtime.user_prompt_started = false
    next.runtime.auto_prompt_view_started = false
    next.runtime.auto_prompt_view_id = ''
    next.runtime.copied_from_auto = []
    next.runtime.working_scene = null
    next.runtime.baseline_scene = null
    next.runtime.generate_error = ''
    next.runtime.selected_node_id = null
    next.runtime.last_output_image_id = ''
    next.runtime.text_started = false
    next.runtime.sketch_editing = false
    next.runtime.result_viewing = false
    next.runtime.step = 'describe'
    const active = next.tasks[index]
    if (active && !active.started_at) active.started_at = nowIso()
    if (active && stageHasSketch(active.stage)) {
      const record = generateSketch(active.image_id, '')
      next.runtime.working_scene = record.output.scene
      next.runtime.baseline_scene = cloneScene(record.output.scene)
      const snap = addSketchSnapshot(next, record.output.scene, record.output.svg, 'initial')
      logEvent(next, 'sketch_snapshot_created', { snapshot_id: snap.snapshot_id, kind: 'initial' })
    }
    logEvent(next, 'task_start')
    logEvent(next, `${active.stage}_task_start`)
    logEvent(next, 'image_view_start')
  }

  function startTask(index: number) {
    update((next) => {
      prepareTask(next, index)
    })
  }

  function saveDraftText(next: Session, type: TextType) {
    const text = next.runtime.draft_text.trim()
    const taskNow = currentTask(next)
    if (!taskNow || !text) return null
    const previous = [...next.text_versions].reverse().find((item) => item.task_id === taskNow.task_id)
    const version = addTextVersion(next, text, type, previous?.text_version_id || '')
    if (type === 'initial' && !taskNow.initial_text_version_id) {
      taskNow.initial_text_version_id = version.text_version_id
    }
    if (type !== 'auto') {
      taskNow.final_text_version_id = version.text_version_id
      taskNow.final_text = version.text
    }
    if (type === 'initial') taskNow.initial_text = version.text
    const eventType = type === 'initial' ? 'initial_text_submit' : 'text_submit'
    logEvent(next, eventType, {
      text_version_id: version.text_version_id,
      text_length: version.text_length,
      text_type: type,
      source: version.source,
    })
    if (type === 'refined' && stageHasSketch(taskNow.stage)) {
      logEvent(next, 'user_prompt_submit', {
        text_version_id: version.text_version_id,
        text_length: version.text_length,
        ...userPromptPayload(next, previous?.text ?? ''),
      })
    }
    return version
  }

  function commitAutoPrompt(next: Session, loc: Locale) {
    const scene = next.runtime.working_scene
    const taskNow = currentTask(next)
    if (!scene || !taskNow || !taskNow.auto_prompt_enabled || next.runtime.round < 1) return
    const baseline = next.runtime.baseline_scene
    const edited =
      Boolean(taskNow.sketch_actions.length) ||
      (baseline != null && JSON.stringify(scene) !== JSON.stringify(baseline))
    if (!edited) return
    const text = sceneToAutoPrompt(scene, loc, next.runtime.baseline_scene)
    if (!text || text === next.runtime.auto_prompt) return
    closeAutoPromptView(next)
    const snapshot = addSketchSnapshot(next, scene, sceneToSvg(scene), 'pre_auto_prompt')
    logEvent(next, 'sketch_snapshot_created', {
      snapshot_id: snapshot.snapshot_id,
      kind: 'pre_auto_prompt',
    })
    next.runtime.auto_prompt = text
    const previous = [...next.text_versions]
      .reverse()
      .find((item) => item.task_id === taskNow.task_id && item.text_type === 'auto')
    const version = addTextVersion(next, text, 'auto', previous?.text_version_id || '')
    const record = createAutoPromptRecord(next, text, snapshot.snapshot_id, next.runtime.draft_text)
    logEvent(next, 'auto_prompt_generated', {
      auto_prompt_id: record.auto_prompt_id,
      text_version_id: version.text_version_id,
      text_length: version.text_length,
      source_sketch_snapshot_id: snapshot.snapshot_id,
    })
    openAutoPromptView(next, { auto_prompt_id: record.auto_prompt_id, text_version_id: version.text_version_id })
  }

  function closeTaskInstruments(next: Session) {
    closeSketchEdit(next)
    closeAutoPromptView(next)
    closeResultView(next)
    closeTextEdit(next)
  }

  function endCurrentTask(next: Session) {
    const active = currentTask(next)
    if (!active) return
    closeTaskInstruments(next)
    if (next.runtime.draft_text.trim()) {
      const version = saveDraftText(next, 'final')
      if (version) finalizeAutoPrompts(next, version.text, version.text_version_id)
    }
    if (active.stage === 'T2') ensureT2ProtocolSnapshots(next)
    active.ended_at = nowIso()
    logEvent(next, 'image_view_end')
    logEvent(next, 'task_end')
    logEvent(next, `${active.stage}_task_end`)
    summarizeTask(next, active)
    logEvent(next, 'next_task_click')
  }

  function goToNextTask(next: Session) {
    const nextIndex = next.runtime.task_index + 1
    if (nextIndex >= next.tasks.length) {
      next.runtime.step = 'questionnaire'
      return
    }
    prepareTask(next, nextIndex)
  }

  function finishTask() {
    update((next) => {
      const active = currentTask(next)
      if (!active) return
      if (active.stage === 'T0') {
        if (next.runtime.draft_text.trim()) saveDraftText(next, 'initial')
        endCurrentTask(next)
        goToNextTask(next)
        return
      }
      closeTaskInstruments(next)
      active.satisfied_round = next.runtime.round
      logEvent(next, 'satisfied_click', { round: next.runtime.round })
      next.runtime.step = 'self_report'
    })
  }

  async function runGenerate() {
    const text = session.runtime.draft_text.trim()
    if (!text) return
    const live = structuredClone(session)
    const active = currentTask(live)
    if (!active || !active.ai_enabled) return
    const nextRound = Math.min(MAX_ROUNDS, live.runtime.round + 1)
    closeResultView(live)
    closeSketchEdit(live)
    closeAutoPromptView(live)
    closeTextEdit(live)
    live.runtime.round = nextRound
    active.round = nextRound
    logEvent(live, 'generate_click')
    logEvent(live, 'round_start', { round: nextRound })
    if (active.auto_prompt_enabled) commitAutoPrompt(live, locale)
    const textType: TextType = nextRound === 1 ? 'initial' : 'refined'
    const version = saveDraftText(live, textType)
    if (version) finalizeAutoPrompts(live, version.text, version.text_version_id)
    const researchSnap = live.runtime.working_scene
      ? addSketchSnapshot(
          live,
          live.runtime.working_scene,
          sceneToSvg(live.runtime.working_scene),
          nextRound === 1 ? 'after' : 'post_user_revision',
        )
      : null
    if (researchSnap) {
      logEvent(live, 'sketch_snapshot_created', { snapshot_id: researchSnap.snapshot_id, kind: researchSnap.kind })
    }
    live.runtime.step = 'generating'
    live.runtime.generate_error = ''
    const started = nowIso()
    const apiPayload = {
      api_input: 'image+text' as const,
      sketch_sent: false,
      prompt: text,
      input_image_id: active.image_id,
      input_text: text,
      image_count: 1,
      model: 'jimeng_t2i_v40',
      model_version: 'jimeng_t2i_v40',
    }
    logEvent(live, 'generation_start', { ...apiPayload, sketch_included: false })
    persist(live)
    setSession(live)

    let images: string[] = []
    try {
      const originalUrl = stimulusUrl(getImage(active.image_id).image_path)
      const composed = await composeConditioning(originalUrl, null)
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
      input_text_version_id: version?.text_version_id || active.final_text_version_id,
      input_sketch_snapshot_id: '',
      source_sketch_snapshot_id: researchSnap?.snapshot_id || '',
      sketch_sent: false,
      api_input: 'image+text',
      api_payload: { ...apiPayload, image_count: images.length, jimeng_task_id: result.meta.jimeng_task_id },
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
    live.runtime.user_prompt_started = false
    live.runtime.text_started = false
    active.rounds.push({
      round: live.runtime.round,
      text_version_id: active.final_text_version_id,
      generation_id: generation.generation_id,
      sketch_snapshot_before_id: researchSnap?.snapshot_id || '',
      sketch_snapshot_after_id: researchSnap?.snapshot_id || '',
      started_at: started,
      ended_at: ended,
    })
    logEvent(live, 'generation_end', {
      generation_id: generation.generation_id,
      success,
      latency_ms: generation.latency_ms,
      sketch_sent: false,
      api_input: 'image+text',
    })
    logEvent(live, success ? 'generation_success' : 'generation_failure', { error: result.meta.error })
    logEvent(live, 'round_end', { round: live.runtime.round })
    openResultView(live)
    persist(live)
    setSession(structuredClone(live))
  }

  function onTextChange(value: string) {
    update((next) => {
      if (!next.runtime.text_started && value.trim()) {
        next.runtime.text_started = true
        logEvent(next, 'text_input_start')
      }
      const sketchStage = currentTask(next)?.auto_prompt_enabled && next.runtime.round >= 1
      if (sketchStage && !next.runtime.user_prompt_started && value !== next.runtime.auto_prompt) {
        next.runtime.user_prompt_started = true
        const previous = [...next.text_versions].reverse().find((item) => item.task_id === currentTask(next)?.task_id && item.text_type !== 'auto')
        logEvent(next, 'user_prompt_edit_start', userPromptPayload(next, previous?.text ?? next.runtime.draft_text))
        closeAutoPromptView(next)
      }
      next.runtime.draft_text = value
    })
    if (changeTimer.current) window.clearTimeout(changeTimer.current)
    changeTimer.current = window.setTimeout(() => {
      const latest = getSession(session.participant_id)
      if (!latest) return
      const sketchStage = currentTask(latest)?.auto_prompt_enabled && latest.runtime.round >= 1
      const previous = [...latest.text_versions]
        .reverse()
        .find((item) => item.task_id === currentTask(latest)?.task_id && item.text_type !== 'auto')
      logEvent(latest, sketchStage ? 'user_prompt_change' : 'text_change', {
        text_length: latest.runtime.draft_text.length,
        ...(sketchStage ? userPromptPayload(latest, previous?.text ?? '') : {}),
      })
      persist(latest)
    }, 800)
  }

  function onSketchChange(scene: SketchScene, action?: SketchEdit) {
    const latest = structuredClone(getSession(session.participant_id) ?? session)
    if (!latest.runtime.sketch_editing) {
      latest.runtime.sketch_editing = true
      logEvent(latest, 'sketch_edit_start')
    }
    latest.runtime.working_scene = cloneScene(scene)
    if (action) {
      addSketchAction(
        latest,
        action.action_type || action.action,
        action.target_id || action.target,
        action.before_state,
        action.after_state,
      )
    }
    persist(latest)
    setSession(latest)
    if (sketchTimer.current) window.clearTimeout(sketchTimer.current)
    sketchTimer.current = window.setTimeout(() => {
      const current = getSession(session.participant_id)
      if (!current) return
      if (current.runtime.sketch_editing) {
        current.runtime.sketch_editing = false
        logEvent(current, 'sketch_edit_end')
      }
      commitAutoPrompt(current, locale)
      persist(current)
      setSession(structuredClone(current))
    }, 400)
  }

  const generating = session.runtime.step === 'generating'
  const showSketch = Boolean(task.sketch_enabled)
  const prompt =
    task.stage === 'T0'
      ? t.observeT0
      : task.stage === 'T3'
        ? session.runtime.step === 'review'
          ? t.refineT3
          : t.observeT3
        : session.runtime.step === 'review'
          ? t.refine
          : t.observeAdjust

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
          autoPrompt={session.runtime.auto_prompt}
          prompt={prompt}
          scene={session.runtime.working_scene}
          showSketch={showSketch}
          lastGenerationId={lastGen?.generation_id || session.runtime.last_output_image_id}
          generateError={session.runtime.generate_error}
          onTextFocus={() =>
            update((next) => {
              logEvent(next, 'text_focus')
            })
          }
          onTextChange={onTextChange}
          onSketchChange={onSketchChange}
          onCopyAuto={() =>
            update((next) => {
              recordCopyEvent(next, 'auto_prompt', next.runtime.auto_prompt)
            })
          }
          onPasteUser={(pasted) =>
            update((next) => {
              recordPasteEvent(next, pasted, pastedFromAuto(next.runtime.auto_prompt, pasted))
            })
          }
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
          {task.stage !== 'T0' && canGenerate ? (
            <Button fill disabled={session.runtime.draft_text.trim().length === 0} onClick={() => void runGenerate()}>
              {t.generate}
              {session.runtime.round > 0 ? ` (${session.runtime.round}/${MAX_ROUNDS})` : ''}
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
  autoPrompt,
  prompt,
  scene,
  showSketch,
  lastGenerationId,
  generateError,
  onTextFocus,
  onTextChange,
  onSketchChange,
  onCopyAuto,
  onPasteUser,
  onSelect,
}: {
  image: ImageDef
  stage: TaskRun['stage']
  round: number
  text: string
  autoPrompt: string
  prompt: string
  scene: SketchScene | null
  showSketch: boolean
  lastGenerationId: string
  generateError: string
  onTextFocus: () => void
  onTextChange: (value: string) => void
  onSketchChange: (scene: SketchScene, action?: SketchEdit) => void
  onCopyAuto: () => void
  onPasteUser: (pasted: string) => void
  onSelect: (id: string | null) => void
}) {
  const columns = stage === 'T0' ? 'workspace-t0' : showSketch ? 'workspace-t2' : 'workspace-t1'
  const splitPrompt = showSketch && round >= 1
  const { t, format } = useI18n()
  return (
    <main className={`workspace ${columns}`}>
      <section>
        <h2>{t.currentImage}</h2>
        <img className="stimulus-small" src={stimulusUrl(image.image_path)} alt="" />
      </section>
      {showSketch ? (
        <section>
          <h2>{t.sketch}</h2>
          {scene ? (
            <SceneEditor scene={scene} onChange={onSketchChange} onSelect={onSelect} />
          ) : (
            <div className="empty-sketch">{t.sketch}</div>
          )}
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
      {splitPrompt ? (
        <div className="prompt-split">
          <section>
            <h2>{t.aiInterpretation}</h2>
            <p className="hint">{t.autoPromptHint}</p>
            <div className="auto-prompt" onCopy={onCopyAuto}>
              {autoPrompt || t.autoPromptEmpty}
            </div>
          </section>
          <section>
            <h2>{t.userPrompt}</h2>
            <p className="hint">{prompt}</p>
            <textarea
              value={text}
              onFocus={onTextFocus}
              onChange={(e) => onTextChange(e.target.value)}
              onPaste={(e) => onPasteUser(e.clipboardData.getData('text'))}
            />
          </section>
        </div>
      ) : (
        <section className="desc-pane">
          <h2>{t.description}</h2>
          <p className="hint">{prompt}</p>
          <textarea
            value={text}
            onFocus={onTextFocus}
            onChange={(e) => onTextChange(e.target.value)}
            onPaste={(e) => onPasteUser(e.clipboardData.getData('text'))}
          />
        </section>
      )}
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

function SelfReport({
  session,
  onChange,
  onRestart,
  onSubmit,
  onSessionChange,
}: {
  session: Session
  onChange: (selfAlignment: number | null, resultAlignment: number | null) => void
  onRestart: () => void
  onSubmit: () => void
  onSessionChange: (session: Session) => void
}) {
  const { t } = useI18n()
  const task = currentTask(session)
  const ready = Boolean(task?.self_alignment_rating && task?.result_alignment_rating)
  return (
    <SessionChrome
      session={session}
      title={t.selfReportTitle}
      extra={session.participant_id}
      onSessionChange={onSessionChange}
    >
      <main className="page">
        <Likert
          label={t.selfAlignment}
          hint={t.selfAlignmentHint}
          value={task?.self_alignment_rating ?? null}
          onChange={(n) => onChange(n, task?.result_alignment_rating ?? null)}
        />
        <Likert
          label={t.resultAlignment}
          hint={t.resultAlignmentHint}
          value={task?.result_alignment_rating ?? null}
          onChange={(n) => onChange(task?.self_alignment_rating ?? null, n)}
        />
      </main>
      <FooterBar style={{ justifyContent: 'space-between' }}>
        <Button onClick={onRestart}>{t.startOver}</Button>
        <Button fill disabled={!ready} onClick={onSubmit}>
          {t.continue}
        </Button>
      </FooterBar>
    </SessionChrome>
  )
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
