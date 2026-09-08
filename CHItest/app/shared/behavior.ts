import type { BehavioralMeasures, Session, TaskRun, TimelineEvent } from './types'

function durationBetween(log: TimelineEvent[], startType: string, endType: string, taskId?: string): number {
  const events = taskId ? log.filter((item) => item.task_id === taskId) : log
  let total = 0
  let start: TimelineEvent | null = null
  for (const event of events) {
    if (event.event_type === startType) start = event
    if (event.event_type === endType && start) {
      total += Math.max(0, event.relative_time_ms - start.relative_time_ms)
      start = null
    }
  }
  return total
}

function durationBetweenAny(
  log: TimelineEvent[],
  startTypes: string[],
  endTypes: string[],
  taskId?: string,
): number {
  const events = taskId ? log.filter((item) => item.task_id === taskId) : log
  let total = 0
  let start: TimelineEvent | null = null
  for (const event of events) {
    if (startTypes.includes(event.event_type)) start = event
    if (endTypes.includes(event.event_type) && start) {
      total += Math.max(0, event.relative_time_ms - start.relative_time_ms)
      start = null
    }
  }
  return total
}

function countTypes(log: TimelineEvent[], matcher: (type: string) => boolean, taskId?: string): number {
  return log.filter((item) => (!taskId || item.task_id === taskId) && matcher(item.event_type)).length
}

function mean(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function satisfactionFromLog(
  session: Session,
  task: TaskRun,
): { round: number | null; time: number | null } {
  const log = session.event_log.filter((item) => item.task_id === task.task_id)
  const start = log.find((item) => item.event_type === 'task_start')
  const satisfied = log.find((item) => item.event_type === 'satisfied_click')
  if (!satisfied) {
    return { round: task.satisfied_round, time: null }
  }
  const payloadRound = satisfied.payload.round
  const round =
    typeof payloadRound === 'number'
      ? payloadRound
      : satisfied.round
        ?? task.satisfied_round
        ?? session.generations.filter((item) => item.task_id === task.task_id).length
        ?? null
  const time = start ? Math.max(0, satisfied.relative_time_ms - start.relative_time_ms) : null
  return { round, time }
}

function taskTimeMs(session: Session, task: TaskRun): number | null {
  const log = session.event_log.filter((item) => item.task_id === task.task_id)
  const start = log.find((item) => item.event_type === 'task_start')
  const satisfied = log.find((item) => item.event_type === 'satisfied_click')
  const end = log.find((item) => item.event_type === 'task_end')
  const stop = satisfied ?? end
  if (!start || !stop) return null
  return Math.max(0, stop.relative_time_ms - start.relative_time_ms)
}

export function measuresForTask(session: Session, task: TaskRun): BehavioralMeasures {
  const log = session.event_log
  const id = task.task_id
  const gens = session.generations.filter((item) => item.task_id === id)
  const actions = task.sketch_actions
  const satisfaction = satisfactionFromLog(session, task)
  const textActive = durationBetweenAny(
    log,
    ['text_input_start', 'text_focus', 'user_prompt_edit_start'],
    ['text_edit_end', 'text_submit', 'initial_text_submit', 'user_prompt_submit', 'user_prompt_edit_end', 'generate_click'],
    id,
  )
  const autoView = durationBetween(log, 'auto_prompt_view_start', 'auto_prompt_view_end', id)
  const resultView = durationBetweenAny(
    log,
    ['result_view_start', 'generated_image_view_start'],
    ['result_view_end', 'generated_image_view_end'],
    id,
  )
  const autos = session.auto_prompts.filter((item) => item.task_id === id)
  const copyValues = autos.map((item) => item.copy_ratio).filter((item): item is number => item != null)
  return {
    total_session_time: null,
    task_time: taskTimeMs(session, task),
    text_writing_time: textActive,
    text_active_edit_time: textActive,
    generation_wait_time: gens.reduce((sum, item) => sum + item.latency_ms, 0),
    sketch_edit_time: durationBetween(log, 'sketch_edit_start', 'sketch_edit_end', id),
    auto_prompt_view_time: autoView,
    auto_prompt_view_time_ms: autoView,
    prompt_refinement_time: durationBetweenAny(
      log,
      ['user_prompt_edit_start'],
      ['user_prompt_submit', 'user_prompt_edit_end', 'generate_click'],
      id,
    ),
    result_view_time: resultView,
    time_between_rounds: durationBetween(log, 'round_end', 'round_start', id),
    number_of_rounds: task.rounds.length || gens.length || task.round,
    text_revision_count: session.text_versions.filter((item) => item.task_id === id && item.text_type !== 'initial' && item.text_type !== 'auto').length,
    sketch_revision_count: countTypes(log, (type) => type.startsWith('sketch_') && type !== 'sketch_open' && type !== 'sketch_snapshot_created', id),
    total_sketch_actions: actions.length,
    move_count: actions.filter((item) => item.action_type === 'move' || item.action_type === 'move_object').length,
    rotate_count: actions.filter((item) => item.action_type === 'rotate').length,
    camera_action_count: actions.filter((item) => item.action_type.startsWith('camera') || item.target_id === 'camera').length,
    object_action_count: actions.filter((item) => item.target_id.includes('object') || item.action_type === 'move_object').length,
    relation_action_count: actions.filter((item) =>
      item.action_type === 'change_gaze' || item.action_type === 'change_direction' || item.action_type === 'change_layer',
    ).length,
    add_count: actions.filter((item) => item.action_type === 'add').length,
    delete_count: actions.filter((item) => item.action_type === 'delete').length,
    generation_count: gens.length,
    generation_success_count: gens.filter((item) => item.success).length,
    generation_failure_count: gens.filter((item) => !item.success).length,
    average_generation_latency: mean(gens.map((item) => item.latency_ms)),
    round_of_satisfaction: satisfaction.round,
    time_to_satisfaction: satisfaction.time,
    copy_ratio: copyValues.length ? copyValues[copyValues.length - 1] : null,
  }
}

export function measuresForSession(session: Session): BehavioralMeasures {
  const perTask = session.tasks.map((task) => measuresForTask(session, task))
  const start = session.event_log.find((item) => item.event_type === 'session_start')
  const end = session.event_log.find((item) => item.event_type === 'session_end')
  const sum = (key: keyof BehavioralMeasures) =>
    perTask.reduce((acc, row) => acc + (typeof row[key] === 'number' && row[key] != null ? Number(row[key]) : 0), 0)
  const gens = session.generations
  const satisfied = perTask.filter((row) => row.round_of_satisfaction != null)
  return {
    total_session_time: start && end ? Math.max(0, end.relative_time_ms - start.relative_time_ms) : null,
    task_time: sum('task_time'),
    text_writing_time: sum('text_active_edit_time'),
    text_active_edit_time: sum('text_active_edit_time'),
    generation_wait_time: sum('generation_wait_time'),
    sketch_edit_time: sum('sketch_edit_time'),
    auto_prompt_view_time: sum('auto_prompt_view_time'),
    auto_prompt_view_time_ms: sum('auto_prompt_view_time'),
    prompt_refinement_time: sum('prompt_refinement_time'),
    result_view_time: sum('result_view_time'),
    time_between_rounds: sum('time_between_rounds'),
    number_of_rounds: sum('number_of_rounds'),
    text_revision_count: sum('text_revision_count'),
    sketch_revision_count: sum('sketch_revision_count'),
    total_sketch_actions: sum('total_sketch_actions'),
    move_count: sum('move_count'),
    rotate_count: sum('rotate_count'),
    camera_action_count: sum('camera_action_count'),
    object_action_count: sum('object_action_count'),
    relation_action_count: sum('relation_action_count'),
    add_count: sum('add_count'),
    delete_count: sum('delete_count'),
    generation_count: gens.length,
    generation_success_count: gens.filter((item) => item.success).length,
    generation_failure_count: gens.filter((item) => !item.success).length,
    average_generation_latency: mean(gens.map((item) => item.latency_ms)),
    round_of_satisfaction: satisfied.length === 1 ? satisfied[0].round_of_satisfaction : null,
    time_to_satisfaction: null,
    copy_ratio: null,
  }
}
