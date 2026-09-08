import experimentJson from '../../config/experiment.json'
import imagesJson from '../../data/images/images.json'
import type { ExperimentConfig, GroupId, ImageDef, TaskDef } from './types'

export const experiment = experimentJson as ExperimentConfig
export const images: ImageDef[] = imagesJson.images as ImageDef[]

export const tasks: TaskDef[] = images.map((image) => ({
  id: image.image_id,
  image_id: image.image_id,
  pair: image.task_type,
  title: image.title,
  setting: image.task_type,
  core: image.target_dimensions,
  brief: image.brief,
  file: image.file,
  difficulty: image.difficulty,
  task_type: image.task_type,
  required_dimensions: image.target_dimensions,
  target_dimensions: image.target_dimensions,
  ground_truth: image.ground_truth,
}))

export const GROUP_IDS = Object.keys(experiment.groups) as GroupId[]

export const STUDY_TITLE = 'Sketch-Based Cognitive Scaffolding for Generative AI'

export const SKETCH_MODEL_PROMPT = `Generate a low-fidelity black-and-white storyboard sketch.

Represent only:
- camera position
- character positions
- object positions
- spatial relationships
- gaze direction
- movement
- foreground/midground/background
- composition

Use simple line drawing.

Do not generate:
- realistic faces
- detailed clothing
- textures
- lighting
- colors
- photorealism
- cinematic rendering

The output should resemble a rough storyboard thumbnail.`

export function getImage(imageId: string): ImageDef {
  const image = images.find((item) => item.image_id === imageId)
  if (!image) throw new Error(`Unknown image: ${imageId}`)
  return image
}

export function getTask(taskId: string): TaskDef {
  const task = tasks.find((item) => item.id === taskId || item.image_id === taskId)
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
