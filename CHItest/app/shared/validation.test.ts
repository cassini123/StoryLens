import { describe, expect, it } from 'vitest'
import { createSessionBase } from './sessionInit'
import { TASK_SEQUENCE_VERSION } from './types'
import { makeSession, makeTask } from './testSession'
import { validateSession, validateTask } from './validation'
import { assignImages } from './assign'
import { images } from './config'

describe('formal group metadata', () => {
  it('stores experimental_group, condition_order, and sequence version instead of inferring from task_id', () => {
    const scaffold = createSessionBase({
      participantId: 'P001',
      sessionId: 'S001',
      group: 'scaffold',
      pattern: 'A',
      plan: assignImages(images, 'P001', 'A', 'scaffold'),
      demographics: makeSession().demographics,
      shortSession: false,
      startedAt: '2026-01-01T00:00:00.000Z',
    })
    const control = createSessionBase({
      participantId: 'P002',
      sessionId: 'S002',
      group: 'control',
      pattern: 'B',
      plan: assignImages(images, 'P002', 'B', 'control'),
      demographics: makeSession().demographics,
      shortSession: false,
      startedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(scaffold.experimental_group).toBe('scaffold')
    expect(scaffold.condition_order).toEqual(['T0', 'T1', 'T1', 'T2', 'T2', 'T3', 'T3'])
    expect(scaffold.task_sequence_version).toBe(TASK_SEQUENCE_VERSION)
    expect(scaffold.tasks.map((item) => item.stage)).toEqual(scaffold.condition_order)
    expect(scaffold.tasks[0]).toMatchObject({
      ai_enabled: false,
      sketch_enabled: false,
      auto_prompt_enabled: false,
    })
    expect(control.experimental_group).toBe('control')
    expect(control.condition_order).toEqual(['T0', 'T1', 'T1', 'T1', 'T1', 'T3', 'T3'])
    expect(control.tasks.filter((item) => item.stage === 'T2')).toHaveLength(0)
    expect(control.tasks.filter((item) => item.sketch_enabled)).toHaveLength(0)
  })
})

describe('validation', () => {
  it('flags missing satisfaction derived fields when satisfied_click exists', () => {
    const task = makeTask({
      stage: 'T1',
      task_id: 't1a',
      started_at: '2026-01-01T00:00:00.000Z',
      ended_at: '2026-01-01T00:01:00.000Z',
      satisfied_round: null,
      initial_text: 'hello',
      final_text: 'hello',
    })
    const session = makeSession({
      tasks: [task],
      event_log: [
        {
          event_id: 'e1',
          participant_id: 'P001',
          session_id: 'S001',
          task_id: 't1a',
          stage: 'T1',
          round: 1,
          event_type: 'task_start',
          timestamp: '2026-01-01T00:00:00.000Z',
          relative_time_ms: 0,
          payload: {},
        },
        {
          event_id: 'e2',
          participant_id: 'P001',
          session_id: 'S001',
          task_id: 't1a',
          stage: 'T1',
          round: 1,
          event_type: 'task_end',
          timestamp: '2026-01-01T00:01:00.000Z',
          relative_time_ms: 60000,
          payload: {},
        },
        {
          event_id: 'e3',
          participant_id: 'P001',
          session_id: 'S001',
          task_id: 't1a',
          stage: 'T1',
          round: 1,
          event_type: 'satisfied_click',
          timestamp: '2026-01-01T00:00:50.000Z',
          relative_time_ms: 50000,
          payload: { round: 1 },
        },
      ],
    })
    expect(validateTask(session, task).some((item) => item.code === 'satisfaction_round')).toBe(true)
  })

  it('requires sketch_sent=false and a source snapshot on T2 auto prompts', () => {
    const task = makeTask({
      stage: 'T2',
      task_id: 't2a',
      started_at: '2026-01-01T00:00:00.000Z',
      ended_at: '2026-01-01T00:02:00.000Z',
      initial_text: 'a',
      final_text: 'b',
      satisfied_round: 2,
    })
    const session = makeSession({
      tasks: [task],
      event_log: [
        {
          event_id: 's',
          participant_id: 'P001',
          session_id: 'S001',
          task_id: 't2a',
          stage: 'T2',
          round: 0,
          event_type: 'task_start',
          timestamp: '2026-01-01T00:00:00.000Z',
          relative_time_ms: 0,
          payload: {},
        },
        {
          event_id: 'e',
          participant_id: 'P001',
          session_id: 'S001',
          task_id: 't2a',
          stage: 'T2',
          round: 2,
          event_type: 'task_end',
          timestamp: '2026-01-01T00:02:00.000Z',
          relative_time_ms: 120000,
          payload: {},
        },
      ],
      generations: [
        {
          generation_id: 'g1',
          participant_id: 'P001',
          session_id: 'S001',
          task_id: 't2a',
          stage: 'T2',
          round: 1,
          timestamp_start: '2026-01-01T00:00:10.000Z',
          timestamp_end: '2026-01-01T00:00:12.000Z',
          latency_ms: 2000,
          model: 'jimeng',
          model_version: 'jimeng_t2i_v40',
          input_image_id: 'C04',
          previous_generation_id: null,
          generation_input_chain_valid: true,
          input_text: 'b',
          input_text_version_id: 'txt',
          input_sketch_snapshot_id: '',
          source_sketch_snapshot_id: 'sk_1',
          auto_prompt_id: 'ap1',
          user_prompt_version_id: 'txt',
          sketch_sent: false,
          api_input: 'image+text',
          api_payload: { prompt: 'b', sketch_sent: false, api_input: 'image+text' },
          output_image_id: 'g1',
          success: true,
          error: '',
          meta: {
            engine: 'jimeng',
            prompt: 'b',
            timestamp: '2026-01-01T00:00:12.000Z',
            jimeng_task_id: 'x',
            status: 'done',
            error: '',
          },
        },
      ],
      auto_prompts: [
        {
          auto_prompt_id: 'ap1',
          participant_id: 'P001',
          session_id: 'S001',
          task_id: 't2a',
          round: 2,
          timestamp_generated: '2026-01-01T00:01:00.000Z',
          source_sketch_snapshot_id: '',
          auto_prompt: 'auto',
          auto_prompt_length: 4,
          user_prompt_before: 'a',
          user_prompt_after: 'b',
          user_prompt_version_id: 'txt',
          edit_distance: 1,
          text_similarity: 0,
          copy_ratio: 0,
          copied_segments: [],
        },
      ],
    })
    const codes = validateTask(session, task).map((item) => item.code)
    expect(codes).toContain('auto_snapshot')
    expect(validateSession(session).ok).toBe(false)
  })
})
