import { describe, expect, it } from 'vitest'
import { assignImages } from './assign'
import { getImage, images } from './config'
import { officialTableFiles } from './export'
import { chainInputForRound, lastSuccessfulGeneration } from './generationChain'
import {
  addGeneration,
  addSketchAction,
  addSketchSnapshot,
  addTextVersion,
  closeAutoPromptView,
  closeResultView,
  interpretSketch,
  logEvent,
  openResultView,
} from './logging'
import { canSatisfyTask, t2ScaffoldLoopComplete } from './protocol'
import { createSessionBase, summarizeTask, syncSessionCursor } from './sessionInit'
import { sceneToSvg } from './sketch/render'
import { cloneScene, templateForImage } from './sketch/templates'
import { makeSession } from './testSession'
import { markExportReadiness } from './validation'
import type { ExperimentalGroup, Session, TaskRun } from './types'

function startTask(session: Session, index: number) {
  session.runtime.task_index = index
  session.runtime.round = 0
  session.runtime.draft_text = ''
  session.runtime.auto_prompt = ''
  session.runtime.auto_prompt_id = ''
  session.runtime.step = 'describe'
  const task = session.tasks[index]
  task.started_at = session.started_at
  if (task.stage === 'T2') {
    const scene = templateForImage(getImage(task.image_id))
    session.runtime.working_scene = scene
    session.runtime.baseline_scene = cloneScene(scene)
    addSketchSnapshot(session, scene, sceneToSvg(scene), 'initial')
  }
  logEvent(session, 'task_start')
  logEvent(session, `${task.stage}_task_start`)
  logEvent(session, 'image_view_start')
}

function generateRound(session: Session, text: string, round: number) {
  const task = session.tasks[session.runtime.task_index]
  session.runtime.draft_text = text
  session.runtime.round = round
  task.round = round
  if (round === 1) logEvent(session, 'text_input_start')
  logEvent(session, 'generate_click')
  logEvent(session, 'round_start', { round })
  const previous = lastSuccessfulGeneration(session, task.task_id)
  const chain = chainInputForRound(previous, task.image_id, round)
  const type = round === 1 ? 'initial' : session.auto_prompts.some((item) => item.task_id === task.task_id) ? 'user_revised' : 'refined'
  const version = addTextVersion(session, text, type)
  if (type === 'initial') {
    task.initial_text = text
    task.initial_text_version_id = version.text_version_id
  }
  task.final_text = text
  task.final_text_version_id = version.text_version_id
  logEvent(session, round === 1 ? 'initial_text_submit' : 'text_submit', { text_type: type })
  if (type === 'user_revised') logEvent(session, 'user_prompt_submit', { text_version_id: version.text_version_id })
  const start = version.timestamp
  logEvent(session, 'generation_start', { prompt: text, sketch_sent: false, input_image_id: chain.input_image_id })
  const generation = addGeneration(session, {
    task_id: task.task_id,
    stage: task.stage,
    round,
    timestamp_start: start,
    timestamp_end: start,
    latency_ms: 0,
    model: 'jimeng',
    model_version: 'jimeng_t2i_v40',
    input_image_id: chain.input_image_id,
    previous_generation_id: chain.previous_generation_id,
    generation_input_chain_valid: chain.generation_input_chain_valid,
    input_text: text,
    input_text_version_id: version.text_version_id,
    input_sketch_snapshot_id: '',
    source_sketch_snapshot_id: [...session.auto_prompts].reverse().find((item) => item.task_id === task.task_id)?.source_sketch_snapshot_id || '',
    auto_prompt_id: session.runtime.auto_prompt_id,
    user_prompt_version_id: version.text_version_id,
    sketch_sent: false,
    api_input: 'image+text',
    api_payload: { prompt: text, sketch_sent: false, api_input: 'image+text', input_image_id: chain.input_image_id },
    output_image_id: '',
    success: true,
    error: '',
    meta: { engine: 'jimeng', prompt: text, timestamp: start, jimeng_task_id: 'x', status: 'done', error: '' },
  })
  generation.output_image_id = generation.generation_id
  generation.timestamp_end = generation.timestamp_start
  logEvent(session, 'generation_end', { generation_id: generation.generation_id, success: true })
  logEvent(session, 'generation_success')
  logEvent(session, 'round_end', { round })
  openResultView(session)
  closeResultView(session)
  return generation
}

function endModificationTask(session: Session) {
  const task = session.tasks[session.runtime.task_index]
  task.satisfied_round = session.runtime.round
  task.self_alignment_rating = 6
  task.result_alignment_rating = 5
  logEvent(session, 'satisfied_click', { round: session.runtime.round })
  task.ended_at = task.started_at
  logEvent(session, 'image_view_end')
  logEvent(session, 'task_end')
  logEvent(session, `${task.stage}_task_end`)
  summarizeTask(session, task)
  logEvent(session, 'next_task_click')
}

function runT0(session: Session, index: number) {
  startTask(session, index)
  session.runtime.draft_text = '画面前景有人，远处有空间层次。'
  logEvent(session, 'text_input_start')
  const task = session.tasks[index]
  const version = addTextVersion(session, session.runtime.draft_text, 'initial')
  task.initial_text = version.text
  task.final_text = version.text
  task.initial_text_version_id = version.text_version_id
  task.final_text_version_id = version.text_version_id
  logEvent(session, 'initial_text_submit')
  task.ended_at = task.started_at
  logEvent(session, 'image_view_end')
  logEvent(session, 'task_end')
  logEvent(session, 'T0_task_end')
  summarizeTask(session, task)
  logEvent(session, 'next_task_click')
}

function runT1orT3(session: Session, index: number) {
  startTask(session, index)
  const first = generateRound(session, '把人物和背景的空间距离拉开。', 1)
  const second = generateRound(session, '再把镜头稍微侧移，保持人物身份不变。', 2)
  expect(second.input_image_id).toBe(first.output_image_id)
  expect(second.previous_generation_id).toBe(first.generation_id)
  endModificationTask(session)
}

function runT2(session: Session, index: number) {
  startTask(session, index)
  const first = generateRound(session, '先按当前画面生成一版。', 1)
  const task = session.tasks[index]
  const scene = session.runtime.working_scene
  if (!scene) throw new Error('T2 needs a scene')
  scene.camera.x += 40
  addSketchAction(session, 'camera_move', 'camera', { x: 90 }, { x: scene.camera.x })
  interpretSketch(session, '摄影机向右侧移动，人物距离保持不变。')
  closeAutoPromptView(session)
  logEvent(session, 'user_prompt_edit_start')
  session.runtime.draft_text = '把摄影机移到更靠右侧的位置，不要改人物是谁。'
  const snap = addSketchSnapshot(session, scene, sceneToSvg(scene), 'post_user_revision')
  logEvent(session, 'sketch_snapshot_created', { snapshot_id: snap.snapshot_id, kind: 'post_user_revision' })
  const second = generateRound(session, session.runtime.draft_text, 2)
  expect(second.input_image_id).toBe(first.output_image_id)
  expect(second.previous_generation_id).toBe(first.generation_id)
  expect(second.sketch_sent).toBe(false)
  expect(second.input_text).toBe(session.runtime.draft_text)
  expect(t2ScaffoldLoopComplete(session, task)).toBe(true)
  expect(canSatisfyTask(session, task, session.runtime.draft_text)).toBe(true)
  endModificationTask(session)
}

function completeGolden(group: ExperimentalGroup, participantId: string): Session {
  const session = createSessionBase({
    participantId,
    sessionId: `S${participantId.slice(1)}`,
    group,
    pattern: 'A',
    plan: assignImages(images, participantId, 'A', group, 7),
    demographics: makeSession().demographics,
    shortSession: false,
    startedAt: '2026-09-01T00:00:00.000Z',
  })
  logEvent(session, 'session_start')
  logEvent(session, 'group_assignment', { experimental_group: group })
  session.tasks.forEach((task, index) => {
    if (task.stage === 'T0') runT0(session, index)
    else if (task.stage === 'T2') runT2(session, index)
    else runT1orT3(session, index)
  })
  session.runtime.step = 'complete'
  session.completed_at = '2026-09-01T01:00:00.000Z'
  logEvent(session, 'session_end')
  session.subjective = {
    perceived_control: 5,
    perceived_usefulness: 5,
    cognitive_effort: 4,
    confidence: 5,
  }
  syncSessionCursor(session)
  markExportReadiness(session)
  return session
}

describe('golden protocol lock', () => {
  it('passes study validation for the scaffold sequence', () => {
    const session = completeGolden('scaffold', 'P101')
    expect(session.tasks.map((item) => item.stage)).toEqual(['T0', 'T1', 'T1', 'T2', 'T2', 'T3', 'T3'])
    expect(session.tasks[0].target_modification_specification).toBeNull()
    const t2 = session.tasks.filter((item) => item.stage === 'T2')
    for (const task of t2) {
      const autos = session.auto_prompts.filter((item) => item.task_id === task.task_id)
      const interprets = session.event_log.filter((item) => item.task_id === task.task_id && item.event_type === 'interpret_sketch_click')
      expect(autos).toHaveLength(1)
      expect(interprets).toHaveLength(1)
      expect(session.generations.filter((item) => item.task_id === task.task_id).every((item) => item.sketch_sent === false)).toBe(true)
    }
    const t3 = session.tasks.filter((item) => item.stage === 'T3')
    for (const task of t3) {
      expect(task.sketch_enabled).toBe(false)
      expect(session.auto_prompts.filter((item) => item.task_id === task.task_id)).toHaveLength(0)
    }
    expect(session.validation?.flags).toMatchObject({
      sequence_correct: true,
      group_assignment_correct: true,
      stimulus_target_alignment: true,
      generation_input_chain_correct: true,
      t0_valid: true,
      t1_valid: true,
      t2_scaffold_loop_valid: true,
      auto_prompt_cycle_valid: true,
      sketch_api_separation_valid: true,
      t3_scaffold_removed: true,
      session_recovery_valid: true,
      timing_complete: true,
      required_exports_present: true,
    })
    expect(session.export_ready).toBe(true)
    expect(session.validation?.issues ?? []).toEqual([])
  })

  it('passes study validation for the control sequence', () => {
    const session = completeGolden('control', 'P102')
    expect(session.tasks.map((item) => item.stage)).toEqual(['T0', 'T1', 'T1', 'T1', 'T1', 'T3', 'T3'])
    expect(session.tasks.filter((item) => item.stage === 'T2')).toHaveLength(0)
    expect(session.export_ready).toBe(true)
    expect(session.validation?.issues ?? []).toEqual([])
  })

  it('does not emit Auto Prompt from sketch actions alone', () => {
    const session = completeGolden('scaffold', 'P103')
    const t2 = session.tasks.find((item) => item.stage === 'T2') as TaskRun
    const sketchEvents = session.event_log.filter((item) => item.task_id === t2.task_id && item.event_type.startsWith('sketch_'))
    const autos = session.auto_prompts.filter((item) => item.task_id === t2.task_id)
    expect(sketchEvents.length).toBeGreaterThan(0)
    expect(autos).toHaveLength(1)
  })

  it('keeps the same session_id on resume and does not duplicate task_start or generation', () => {
    const session = createSessionBase({
      participantId: 'P104',
      sessionId: 'S104',
      group: 'control',
      pattern: 'A',
      plan: assignImages(images, 'P104', 'A', 'control', 11),
      demographics: makeSession().demographics,
      shortSession: false,
      startedAt: '2026-09-01T00:00:00.000Z',
    })
    logEvent(session, 'session_start')
    runT0(session, 0)
    startTask(session, 1)
    generateRound(session, '拉开距离', 1)
    expect(session.tasks[1].ended_at).toBe('')
    expect(session.event_log.filter((item) => item.event_type === 'task_end' && item.task_id === session.tasks[1].task_id)).toHaveLength(0)
    logEvent(session, 'session_resume', { session_id: session.session_id })
    session.session_status = 'resumed'
    generateRound(session, '再侧移镜头', 2)
    const starts = session.event_log.filter((item) => item.event_type === 'task_start' && item.task_id === session.tasks[1].task_id)
    const gens = session.generations.filter((item) => item.task_id === session.tasks[1].task_id)
    expect(starts).toHaveLength(1)
    expect(gens).toHaveLength(2)
    expect(gens[1].input_image_id).toBe(gens[0].output_image_id)
    expect(session.session_id).toBe('S104')
    expect(session.completion_status).toBe('incomplete')
    const validation = markExportReadiness(session)
    expect(validation.export_ready).toBe(false)
    expect(validation.completion_status).toBe('incomplete')
  })

  it('includes validation.json and session_recovery.json in the official export list', () => {
    const names = officialTableFiles([], [], []).map((item) => item.name)
    expect(names).toEqual(expect.arrayContaining([
      'participants.csv',
      'tasks.csv',
      'event_log.csv',
      'text_versions.csv',
      'generations.csv',
      'sketch_interactions.csv',
      'sketch_snapshots.json',
      'auto_prompts.csv',
      'expert_ratings.csv',
      'full_session_timeline.json',
      'validation.json',
      'session_recovery.json',
    ]))
  })
})
