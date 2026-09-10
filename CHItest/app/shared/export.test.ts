import { describe, expect, it } from 'vitest'
import { autoPromptRows, expertRows, officialTableFiles, participantRows } from './export'
import { makeSession, makeTask } from './testSession'

describe('autoPromptRows', () => {
  it('exports a paired auto/user record, not one-sided text versions', () => {
    const task = makeTask({
      stage: 'T2',
      task_id: 't2a',
      image_id: 'C04',
      block: 'middle',
      satisfied_round: 2,
    })
    const session = makeSession({
      tasks: [task],
      auto_prompts: [
        {
          auto_prompt_id: 'ap_1',
          participant_id: 'P001',
          session_id: 'S001',
          task_id: 't2a',
          round: 2,
          timestamp_generated: '2026-01-01T00:02:00.000Z',
          source_sketch_snapshot_id: 'sk_1',
          auto_prompt: '人物 A 位于人物 B 的后方。',
          auto_prompt_length: 14,
          user_prompt_before: '把人往后放',
          user_prompt_after: '将人物 A 放在人物 B 的右后方，并与人物 B 保持明显距离。',
          user_prompt_version_id: 'txt_u',
          edit_distance: 18,
          text_similarity: 0.4,
          copy_ratio: 0.2,
          copied_segments: ['人物 A'],
        },
      ],
    })
    const [row] = autoPromptRows([session])
    expect(row.p_auto).toBe('人物 A 位于人物 B 的后方。')
    expect(row.p_user).toBe('将人物 A 放在人物 B 的右后方，并与人物 B 保持明显距离。')
    expect(row.source_sketch_snapshot_id).toBe('sk_1')
    expect(row.edit_distance).toBe(18)
    expect(row.copy_ratio).toBe(0.2)
  })

  it('exports group as 0/1 for the four-T1 vs T1T1T2T2 split', () => {
    const control = makeSession({ participant_id: 'P010', experimental_group: 'control' })
    const scaffold = makeSession({ participant_id: 'P011', experimental_group: 'scaffold' })
    const rows = participantRows([control, scaffold])
    expect(rows[0]).toMatchObject({ group: 0, group_sequence: 'T1 T1 T1 T1' })
    expect(rows[1]).toMatchObject({ group: 1, group_sequence: 'T1 T1 T2 T2' })
  })

  it('exports final-only per-dimension expert ratings without stage labels', () => {
    const rows = expertRows([
      {
        trial_id: 'T1_early_E01',
        participant_id: 'P004',
        task_id: 'T1_early_E01',
        stage: 'T1',
        expert_id: 'expert_01',
        precision: {
          object: 2,
          spatial: 3,
          relation: null,
          camera: null,
          emotion: null,
          constraint: null,
        },
        interpretability: 6,
        specificity: 5,
        executability: 6,
        comment: 'Stage is nearer; camera not stated.',
        submitted_at: '2026-09-10T00:00:00.000Z',
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      participant_id: 'P004',
      task_id: 'T1_early_E01',
      expert_id: 'expert_01',
      timepoint: 'final',
      object: 2,
      spatial: 3,
      interpretability: 6,
      specificity: 5,
      executability: 6,
    })
    expect(rows[0]).not.toHaveProperty('stage')
  })

  it('lists every official export table in one bundle', () => {
    const names = officialTableFiles([], [], []).map((item) => item.name)
    expect(names).toEqual(expect.arrayContaining([
      'participants.csv',
      'tasks.csv',
      'event_log.csv',
      'events.csv',
      'text_versions.csv',
      'generations.csv',
      'sketch_interactions.csv',
      'sketch_snapshots.json',
      'auto_prompts.csv',
      'expert_ratings.csv',
      'self_alignment.csv',
      'full_session_timeline.json',
      'validation.json',
      'session_recovery.json',
    ]))
  })
})
