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
