import { getGeneratedImage } from './imageStore'
import { getImage, stimulusUrl } from './config'
import type { GenerationRecord, Session, TaskRun } from './types'

export function successfulGenerations(session: Session, taskId: string): GenerationRecord[] {
  return session.generations
    .filter((item) => item.task_id === taskId && item.success)
    .sort((a, b) => a.round - b.round || Date.parse(a.timestamp_start) - Date.parse(b.timestamp_start))
}

export function lastSuccessfulGeneration(session: Session, taskId: string): GenerationRecord | null {
  const gens = successfulGenerations(session, taskId)
  return gens[gens.length - 1] ?? null
}

export function chainInputForRound(
  previous: GenerationRecord | null,
  originalImageId: string,
  round: number,
): {
  input_image_id: string
  previous_generation_id: string | null
  generation_input_chain_valid: boolean
} {
  if (round <= 1) {
    return {
      input_image_id: originalImageId,
      previous_generation_id: null,
      generation_input_chain_valid: previous == null,
    }
  }
  if (!previous?.success || !previous.output_image_id) {
    return {
      input_image_id: originalImageId,
      previous_generation_id: previous?.generation_id ?? null,
      generation_input_chain_valid: false,
    }
  }
  return {
    input_image_id: previous.output_image_id,
    previous_generation_id: previous.generation_id,
    generation_input_chain_valid: previous.output_image_id !== originalImageId || Boolean(previous.generation_id),
  }
}

export function validateGenerationChain(session: Session, task: TaskRun): string[] {
  const issues: string[] = []
  const gens = session.generations
    .filter((item) => item.task_id === task.task_id)
    .sort((a, b) => a.round - b.round || Date.parse(a.timestamp_start) - Date.parse(b.timestamp_start))
  let lastSuccess: GenerationRecord | null = null
  for (const gen of gens) {
    const expected = chainInputForRound(lastSuccess, task.image_id, gen.round)
    if (gen.previous_generation_id !== expected.previous_generation_id) {
      issues.push(`${gen.generation_id} previous_generation_id`)
    }
    if (gen.round <= 1) {
      if (gen.input_image_id !== task.image_id || gen.previous_generation_id != null) {
        issues.push(`${gen.generation_id} round1 must use original stimulus`)
      }
    } else if (gen.success || lastSuccess) {
      if (lastSuccess && gen.input_image_id !== lastSuccess.output_image_id) {
        issues.push(`${gen.generation_id} must use previous output_image_id`)
      }
    }
    if (gen.generation_input_chain_valid !== true && gen.success) {
      if (expected.generation_input_chain_valid) issues.push(`${gen.generation_id} chain flag`)
    }
    if (gen.success) lastSuccess = gen
  }
  return issues
}

export async function resolveConditioningImage(
  session: Session,
  task: TaskRun,
  nextRound: number,
): Promise<{
  url: string
  input_image_id: string
  previous_generation_id: string | null
  generation_input_chain_valid: boolean
}> {
  const previous = lastSuccessfulGeneration(session, task.task_id)
  const expected = chainInputForRound(previous, task.image_id, nextRound)
  const originalUrl = stimulusUrl(getImage(task.image_id).image_path)
  if (nextRound <= 1 || !previous) {
    return { url: originalUrl, ...expected }
  }
  const stored = await getGeneratedImage(previous.output_image_id || previous.generation_id)
  if (!stored) {
    return {
      url: originalUrl,
      input_image_id: task.image_id,
      previous_generation_id: previous.generation_id,
      generation_input_chain_valid: false,
    }
  }
  return {
    url: stored,
    input_image_id: previous.output_image_id || previous.generation_id,
    previous_generation_id: previous.generation_id,
    generation_input_chain_valid: true,
  }
}
