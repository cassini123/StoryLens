import { nowIso } from './time'
import type {
  GenerationRecord,
  Session,
  SketchAction,
  SketchScene,
  SketchSnapshot,
  Stage,
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
    text_length: text.length,
  }
  session.text_versions.push(version)
  return version
}

export function addSketchSnapshot(
  session: Session,
  scene: SketchScene,
  svg: string,
  kind: SketchSnapshot['kind'],
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
    scene,
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
  const action: SketchAction = {
    sketch_event_id: nextSeq(session, 'sa'),
    participant_id: session.participant_id,
    session_id: session.session_id,
    task_id: task.task_id,
    round: session.runtime.round,
    timestamp: nowIso(),
    action_type: actionType,
    target_id: targetId,
    before_state: beforeState,
    after_state: afterState,
  }
  task.sketch_actions.push(action)
  logEvent(session, `sketch_${actionType}`, {
    target_id: targetId,
    before_state: beforeState,
    after_state: afterState,
  })
  return action
}

export function addGeneration(session: Session, record: Omit<GenerationRecord, 'generation_id' | 'participant_id' | 'session_id'>): GenerationRecord {
  const generation: GenerationRecord = {
    ...record,
    generation_id: nextSeq(session, 'gen'),
    participant_id: session.participant_id,
    session_id: session.session_id,
  }
  session.generations.push(generation)
  return generation
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
