import { describe, expect, it } from 'vitest'
import { autoPromptRows } from './export'
import type { Session, TaskRun, TextVersion } from './types'

function version(partial: Partial<TextVersion>): TextVersion {
  return {
    text_version_id: 'txt_1',
    participant_id: 'P001',
    session_id: 'S001',
    task_id: 't2a',
    stage: 'T2',
    round: 2,
    timestamp: '2026-01-01T00:02:00.000Z',
    text: '',
    text_type: 'auto',
    previous_text_version_id: '',
    text_length: 0,
    ...partial,
  }
}

describe('autoPromptRows', () => {
  it('pairs P_auto and P_user without overwriting either', () => {
    const task: TaskRun = {
      participant_id: 'P001',
      session_id: 'S001',
      task_id: 't2a',
      image_id: 'C04',
      stage: 'T2',
      round: 2,
      rounds: [],
      initial_text_version_id: 'txt_i',
      final_text_version_id: 'txt_u',
      satisfied_round: 2,
      started_at: '2026-01-01T00:00:00.000Z',
      ended_at: '2026-01-01T00:03:00.000Z',
      sketch_actions: [],
    }
    const session = {
      participant_id: 'P001',
      session_id: 'S001',
      tasks: [task],
      text_versions: [
        version({
          text_version_id: 'txt_a',
          text_type: 'auto',
          text: '人物 A 位于人物 B 的后方。',
          text_length: 14,
        }),
        version({
          text_version_id: 'txt_u',
          text_type: 'refined',
          text: '将人物 A 放在人物 B 的右后方，并与人物 B 保持明显距离。',
          text_length: 28,
        }),
      ],
    } as Session
    const [row] = autoPromptRows([session])
    expect(row.p_auto).toBe('人物 A 位于人物 B 的后方。')
    expect(row.p_user).toBe('将人物 A 放在人物 B 的右后方，并与人物 B 保持明显距离。')
    expect(row.p_auto_id).toBe('txt_a')
    expect(row.p_user_id).toBe('txt_u')
  })
})

describe('buildParticipantPacket', () => {
  it('includes the session json researchers need without generated image bytes', async () => {
    const { buildParticipantPacket } = await import('./export')
    const task: TaskRun = {
      participant_id: 'P001',
      session_id: 'S001',
      task_id: 't2a',
      image_id: 'C04',
      stage: 'T2',
      block: 'middle',
      round: 2,
      rounds: [],
      initial_text_version_id: 'txt_i',
      final_text_version_id: 'txt_u',
      satisfied_round: 2,
      started_at: '2026-01-01T00:00:00.000Z',
      ended_at: '2026-01-01T00:03:00.000Z',
      sketch_actions: [],
    }
    const session = {
      participant_id: 'P001',
      session_id: 'S001',
      assignment_pattern: 'A',
      experimental_group: 'scaffold',
      demographics: {
        cinematography_experience: 'none',
        cinematography_years: '0',
        visual_experience: 'none',
        ai_familiarity: 'some',
        design_background: false,
        film_background: false,
        film_years: '0',
        ai_experience: 'some',
        image_gen_experience: 'none',
      },
      tasks: [task],
      event_log: [],
      text_versions: [
        version({
          text_version_id: 'txt_u',
          text_type: 'final',
          text: '将人物 A 放在人物 B 的右后方。',
          text_length: 16,
        }),
      ],
      generations: [],
      sketch_snapshots: [],
      subjective: {
        perceived_control: 5,
        perceived_usefulness: 4,
        cognitive_effort: 3,
        confidence: 4,
      },
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:20:00.000Z',
      runtime: {
        step: 'complete',
        task_index: 1,
        round: 2,
        draft_text: '',
        auto_prompt: '',
        auto_prompt_id: '',
        user_prompt_started: false,
        auto_prompt_view_started: false,
        working_scene: null,
        baseline_scene: null,
        generate_error: '',
        selected_node_id: null,
        last_output_image_id: '',
        text_started: false,
        sketch_editing: false,
      },
      seq: 4,
    } as Session
    const packet = await buildParticipantPacket(session, { includeImages: false })
    expect(packet.participant_id).toBe('P001')
    expect(packet.images_included).toBe(false)
    expect(packet.subjective?.perceived_control).toBe(5)
    expect(packet.text_versions[0].text).toContain('右后方')
    expect(packet.tasks[0].task_id).toBe('t2a')
  })
})
