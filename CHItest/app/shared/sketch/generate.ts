import { experiment, SKETCH_MODEL_PROMPT } from '../config'
import { nowIso } from '../time'
import type { SketchRecord, SketchScene } from '../types'
import { applyIntentHeuristics } from './heuristics'
import { sceneToSvg } from './render'
import { cloneScene, templateForTask } from './templates'

export { SKETCH_MODEL_PROMPT }

export function generateMockScene(taskId: string, intent: string): SketchScene {
  const base = cloneScene(templateForTask(taskId))
  return applyIntentHeuristics(base, intent)
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

/**
 * P0 uses controlled mock SVG. sketch_mode=model is reserved and falls back to mock.
 */
export function generateSketch(taskId: string, intent: string): SketchRecord {
  if (experiment.sketch_mode === 'model') {
    // No visual API in P0. Keep generation controlled and reproducible.
  }
  return makeSketchRecord(generateMockScene(taskId, intent))
}
