import { describe, expect, it } from 'vitest'
import { chainInputForRound, validateGenerationChain } from './generationChain'
import { makeGeneration, makeSession, makeTask } from './testSession'

describe('generation current-image chain', () => {
  it('uses the original stimulus on round 1 and the previous output afterwards', () => {
    expect(chainInputForRound(null, 'E01', 1)).toEqual({
      input_image_id: 'E01',
      previous_generation_id: null,
      generation_input_chain_valid: true,
    })
    const first = makeGeneration({ generation_id: 'gen_1', task_id: 't1a', round: 1, input_image_id: 'E01', output_image_id: 'gen_1' })
    expect(chainInputForRound(first, 'E01', 2)).toEqual({
      input_image_id: 'gen_1',
      previous_generation_id: 'gen_1',
      generation_input_chain_valid: true,
    })
  })

  it('flags a task that reuses the original image on round 2', () => {
    const task = makeTask({ stage: 'T1', task_id: 't1a', image_id: 'E01' })
    const session = makeSession({
      tasks: [task],
      generations: [
        makeGeneration({ generation_id: 'g1', task_id: 't1a', round: 1, input_image_id: 'E01', output_image_id: 'g1' }),
        makeGeneration({
          generation_id: 'g2',
          task_id: 't1a',
          round: 2,
          input_image_id: 'E01',
          previous_generation_id: null,
          output_image_id: 'g2',
          generation_input_chain_valid: false,
        }),
      ],
    })
    expect(validateGenerationChain(session, task).some((item) => item.includes('previous output'))).toBe(true)
  })
})
