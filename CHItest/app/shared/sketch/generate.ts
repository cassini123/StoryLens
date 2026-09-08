import { experiment, getImage, SKETCH_MODEL_PROMPT } from '../config'
import { nowIso } from '../time'
import type { SketchRecord, SketchScene } from '../types'
import { applyIntentHeuristics } from './heuristics'
import { sceneToSvg } from './render'
import { cloneScene, templateForImage } from './templates'

export { SKETCH_MODEL_PROMPT }

export function generateMockScene(taskId: string, intent: string): SketchScene {
  const image = getImage(taskId)
  return applyIntentHeuristics(cloneScene(templateForImage(image)), intent)
}

export function makeSketchRecord(scene: SketchScene, generatedAt = nowIso()): SketchRecord {
  return {
    model: experiment.sketch_model.name,
    model_version: experiment.sketch_model.version,
    generation_prompt: experiment.sketch_mode === 'model' ? SKETCH_MODEL_PROMPT : null,
    generation_timestamp: generatedAt,
    output: {
      scene: cloneScene(scene),
      svg: sceneToSvg(scene),
    },
  }
}

export function generateSketch(taskId: string, intent: string): SketchRecord {
  return makeSketchRecord(generateMockScene(taskId, intent))
}
