import experimentJson from '../../config/experiment.json'
import tasksJson from '../../data/tasks/tasks.json'
import type { ExperimentConfig, GroupId, TaskDef } from './types'

export const experiment = experimentJson as ExperimentConfig
export const tasks: TaskDef[] = tasksJson.tasks as TaskDef[]

export const GROUP_IDS = Object.keys(experiment.groups) as GroupId[]

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

export function getTask(taskId: string): TaskDef {
  const task = tasks.find((item) => item.id === taskId)
  if (!task) throw new Error(`Unknown task: ${taskId}`)
  return task
}

export function getExpert(expertId: string) {
  return experiment.experts.find((item) => item.expert_id === expertId)
}
