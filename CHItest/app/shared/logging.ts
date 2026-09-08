import { associatedGenerationRound, normalizeSketchActionType } from './protocol'
import { sceneToSvg } from './sketch/render'
import { cloneScene } from './sketch/templates'
import { nowIso } from './time'
import { eventCopyRatio, levenshtein, textSimilarity, userPromptCompare } from './textCompare'
import type {
  AutoPromptRecord,
  GenerationRecord,
  Session,
  SketchAction,
  SketchScene,
  SketchSnapshot,
  SnapshotKind,
  Stage,
  TextSource,
  TextType,
  TextVersion,
  TimelineEvent,
} from './types'

function nextSeq(session: Session, prefix: string): string {
  session.seq += 1
  return `${prefix}_${session.participant_id}_${String(session.seq).padStart(4, '0')}`
}

export function relativeMs(session: Session, timestamp = nowIso()): number {
  const start = Date.parse(session.started_at)
  const now = Date.parse(timestamp)
  if (!Number.isFinite(start) || !Number.isFinite(now)) return 0
  return Math.max(0, now - start)
}

export function currentTask(session: Session) {
  return session.tasks[session.runtime.task_index] ?? null
}

export function logEvent(
  session: Session,
  eventType: string,
  payload: Record<string, unknown> = {},
  extra: Partial<Pick<TimelineEvent, 'task_id' | 'stage' | 'round'>> = {},
): Session {
  const timestamp = nowIso()
  const task = currentTask(session)
  const event: TimelineEvent = {
    event_id: nextSeq(session, 'evt'),
    participant_id: session.participant_id,
    session_id: session.session_id,
    task_id: extra.task_id ?? task?.task_id ?? '',
    stage: extra.stage ?? task?.stage ?? '',
    round: extra.round ?? (task ? session.runtime.round : null),
    event_type: eventType,
    timestamp,
    relative_time_ms: relativeMs(session, timestamp),
    payload,
  }
  session.event_log.push(event)
  return session
}

export function addTextVersion(
  session: Session,
  text: string,
  textType: TextType,
  previousId = '',
  source: TextSource = textType === 'auto' ? 'system' : 'user',
): TextVersion {
  const task = currentTask(session)
  if (!task) throw new Error('No active task for text version')
  const version: TextVersion = {
    text_version_id: nextSeq(session, 'txt'),
    participant_id: session.participant_id,
    session_id: session.session_id,
    task_id: task.task_id,
    stage: task.stage,
    round: session.runtime.round,
    timestamp: nowIso(),
    text,
    text_type: textType,
    previous_text_version_id: previousId,
    source,
    text_length: text.length,
  }
  session.text_versions.push(version)
  return version
}

export function addSketchSnapshot(
  session: Session,
  scene: SketchScene,
  svg: string,
  kind: SnapshotKind,
): SketchSnapshot {
  const task = currentTask(session)
  if (!task) throw new Error('No active task for sketch snapshot')
  const snapshot: SketchSnapshot = {
    snapshot_id: nextSeq(session, 'sk'),
    participant_id: session.participant_id,
    session_id: session.session_id,
    task_id: task.task_id,
    stage: task.stage,
    round: session.runtime.round,
    kind,
    timestamp: nowIso(),
    scene: cloneScene(scene),
    svg,
  }
  session.sketch_snapshots.push(snapshot)
  return snapshot
}

export function addSketchAction(
  session: Session,
  actionType: string,
  targetId: string,
  beforeState: unknown,
  afterState: unknown,
): SketchAction {
  const task = currentTask(session)
  if (!task) throw new Error('No active task for sketch action')
  const normalized = normalizeSketchActionType(actionType)
  const associated = associatedGenerationRound(session.runtime.round)
  const action: SketchAction = {
    sketch_event_id: nextSeq(session, 'sa'),
    participant_id: session.participant_id,
    session_id: session.session_id,
    task_id: task.task_id,
    round: session.runtime.round,
    associated_generation_round: associated,
    timestamp: nowIso(),
    action_type: normalized,
    target_id: targetId,
    before_state: beforeState,
    after_state: afterState,
  }
  task.sketch_actions.push(action)
  logEvent(session, `sketch_${normalized}`, {
    target_id: targetId,
    before_state: beforeState,
    after_state: afterState,
    associated_generation_round: associated,
  })
  return action
}

export function addGeneration(
  session: Session,
  record: Omit<GenerationRecord, 'generation_id' | 'participant_id' | 'session_id'>,
): GenerationRecord {
  const generation: GenerationRecord = {
    ...record,
    generation_id: nextSeq(session, 'gen'),
    participant_id: session.participant_id,
    session_id: session.session_id,
  }
  session.generations.push(generation)
  return generation
}

export function closeAutoPromptView(session: Session, extra: Record<string, unknown> = {}): void {
  if (!session.runtime.auto_prompt_view_started) return
  const start = [...session.event_log]
    .reverse()
    .find((item) => item.event_type === 'auto_prompt_view_start' && item.task_id === currentTask(session)?.task_id)
  const timestamp = nowIso()
  const viewTime = start ? Math.max(0, relativeMs(session, timestamp) - start.relative_time_ms) : 0
  logEvent(session, 'auto_prompt_view_end', {
    auto_prompt_id: session.runtime.auto_prompt_id,
    view_id: session.runtime.auto_prompt_view_id,
    auto_prompt_view_time_ms: viewTime,
    ...extra,
  })
  session.runtime.auto_prompt_view_started = false
  session.runtime.auto_prompt_view_id = ''
}

export function openAutoPromptView(session: Session, extra: Record<string, unknown> = {}): void {
  if (session.runtime.auto_prompt_view_started) closeAutoPromptView(session)
  session.runtime.auto_prompt_view_started = true
  session.runtime.auto_prompt_view_id = nextSeq(session, 'apv')
  logEvent(session, 'auto_prompt_view_start', {
    auto_prompt_id: session.runtime.auto_prompt_id,
    text_version_id: session.runtime.auto_prompt_id,
    view_id: session.runtime.auto_prompt_view_id,
    ...extra,
  })
}

export function closeResultView(session: Session): void {
  if (!session.runtime.result_viewing) return
  logEvent(session, 'result_view_end')
  logEvent(session, 'generated_image_view_end')
  session.runtime.result_viewing = false
}

export function openResultView(session: Session): void {
  closeResultView(session)
  session.runtime.result_viewing = true
  logEvent(session, 'generated_image_view')
  logEvent(session, 'generated_image_view_start')
  logEvent(session, 'result_view_start')
}

export function closeSketchEdit(session: Session): void {
  if (!session.runtime.sketch_editing) return
  session.runtime.sketch_editing = false
  logEvent(session, 'sketch_edit_end')
}

export function userPromptPayload(session: Session, previous = ''): Record<string, unknown> {
  return userPromptCompare({
    autoPrompt: session.runtime.auto_prompt,
    previous,
    current: session.runtime.draft_text,
    copiedSegments: session.runtime.copied_from_auto,
    sourceAutoPromptId: session.runtime.auto_prompt_id,
  })
}

export function closeTextEdit(session: Session): void {
  const previous = [...session.text_versions]
    .reverse()
    .find((item) => item.task_id === currentTask(session)?.task_id && item.text_type !== 'auto')
  const payload = userPromptPayload(session, previous?.text ?? '')
  if (session.runtime.user_prompt_started) {
    logEvent(session, 'user_prompt_edit_end', payload)
    session.runtime.user_prompt_started = false
  }
  if (session.runtime.text_started) {
    logEvent(session, 'text_edit_end')
    session.runtime.text_started = false
  }
}

export function ensureT2ProtocolSnapshots(session: Session): void {
  const task = currentTask(session)
  const scene = session.runtime.working_scene
  if (!task || task.stage !== 'T2' || !scene) return
  const kinds = new Set(
    session.sketch_snapshots.filter((item) => item.task_id === task.task_id).map((item) => item.kind),
  )
  const svg = sceneToSvg(scene)
  for (const kind of ['initial', 'pre_auto_prompt', 'post_user_revision'] as const) {
    if (kinds.has(kind)) continue
    const snap = addSketchSnapshot(session, scene, svg, kind)
    logEvent(session, 'sketch_snapshot_created', { snapshot_id: snap.snapshot_id, kind, ensured: true })
  }
}

export function recordCopyEvent(
  session: Session,
  source: 'auto_prompt' | 'user_prompt' | 'external',
  text: string,
): void {
  logEvent(session, 'copy', { source, text_length: text.length })
  logEvent(session, 'copy_event', {
    source,
    target: source === 'auto_prompt' ? 'clipboard' : 'clipboard',
    copied_text_length: text.length,
    timestamp: nowIso(),
  })
}

export function recordPasteEvent(
  session: Session,
  pasted: string,
  fromAuto: boolean,
): void {
  const source = fromAuto ? 'auto_prompt' : 'external'
  logEvent(session, 'paste', { text_length: pasted.length, from_auto: fromAuto, source })
  logEvent(session, 'paste_event', {
    source,
    target: 'user_prompt',
    copied_text_length: fromAuto ? pasted.length : 0,
    paste_length: pasted.length,
    timestamp: nowIso(),
  })
  if (fromAuto) {
    session.runtime.copied_from_auto.push(pasted)
    logEvent(session, 'paste_from_auto_prompt', { text_length: pasted.length })
    const open = openAutoPrompt(session)
    if (open) open.copied_segments.push(pasted)
  }
}

function openAutoPrompt(session: Session): AutoPromptRecord | undefined {
  return [...session.auto_prompts].reverse().find((item) => item.auto_prompt_id === session.runtime.auto_prompt_id)
}

export function createAutoPromptRecord(
  session: Session,
  text: string,
  snapshotId: string,
  userPromptBefore: string,
): AutoPromptRecord {
  const task = currentTask(session)
  if (!task) throw new Error('No active task for auto prompt')
  const record: AutoPromptRecord = {
    auto_prompt_id: nextSeq(session, 'ap'),
    participant_id: session.participant_id,
    session_id: session.session_id,
    task_id: task.task_id,
    round: associatedGenerationRound(session.runtime.round),
    timestamp_generated: nowIso(),
    source_sketch_snapshot_id: snapshotId,
    auto_prompt: text,
    auto_prompt_length: text.length,
    user_prompt_before: userPromptBefore,
    user_prompt_after: '',
    user_prompt_version_id: '',
    edit_distance: null,
    text_similarity: null,
    copy_ratio: null,
    copied_segments: [],
  }
  session.auto_prompts.push(record)
  session.runtime.auto_prompt_id = record.auto_prompt_id
  return record
}

export function finalizeAutoPrompts(
  session: Session,
  userText: string,
  userVersionId: string,
): void {
  const task = currentTask(session)
  if (!task) return
  const open = session.auto_prompts.filter((item) => item.task_id === task.task_id && !item.user_prompt_after)
  for (const record of open) {
    record.user_prompt_after = userText
    record.user_prompt_version_id = userVersionId
    record.edit_distance = levenshtein(record.auto_prompt, userText)
    record.text_similarity = textSimilarity(record.auto_prompt, userText)
    record.copy_ratio = eventCopyRatio(record.copied_segments, userText)
  }
}

export function replaceTask(session: Session, task: TaskRunLike): Session {
  const tasks = session.tasks.map((item) => (item.task_id === task.task_id ? task : item))
  session.tasks = tasks
  return session
}

type TaskRunLike = Session['tasks'][number]

export function stageOf(session: Session): Stage | '' {
  return currentTask(session)?.stage ?? ''
}
