import experimentJson from '../../config/experiment.json'
import stimuliJson from '../../data/tasks/stimuli.json'
import targetModsJson from '../../data/tasks/target_modifications.json'
import type { ExperimentConfig, ImageDef, PrecisionDim, Stage, TaskDef } from './types'

export const experiment = experimentJson as ExperimentConfig

const targetMods = targetModsJson as Record<
  string,
  {
    current_visual_state?: string
    target_modification?: Partial<Record<PrecisionDim, string>>
  }
>

export const images: ImageDef[] = (stimuliJson.images as ImageDef[]).map((image) => ({
  ...image,
  ...(targetMods[image.image_id] ?? {}),
}))
export const tasks: TaskDef[] = images
export const STUDY_TITLE = experiment.study.title

export const SKETCH_MODEL_PROMPT = `Generate a low-fidelity black-and-white storyboard sketch.

Represent only camera position, character positions, object positions, spatial relationships, gaze, movement, depth, and composition.

Use simple line drawing. Do not generate realistic faces, clothing, textures, lighting, color, or photorealism.`

export function getImage(imageId: string): ImageDef {
  const image = images.find((item) => item.image_id === imageId)
  if (!image) throw new Error(`Unknown image: ${imageId}`)
  return image
}

export function getTask(taskId: string): TaskDef {
  const id = taskId.includes('_') ? taskId.split('_').pop() || taskId : taskId
  const task = tasks.find((item) => item.image_id === taskId || item.image_id === id)
  if (!task) throw new Error(`Unknown task: ${taskId}`)
  return task
}

export function stimulusUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${file.replace(/^\//, '')}`
}

export function getExpert(expertId: string) {
  return experiment.experts.find((item) => item.expert_id === expertId)
}

export function stageHasSketch(stage: Stage): boolean {
  return stage === 'T2' || stage === 'T3'
}

export function stageHasGeneration(stage: Stage): boolean {
  return stage !== 'T0'
}
