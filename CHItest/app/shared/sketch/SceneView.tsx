import type { SketchScene } from '../types'
import { sceneToSvg } from './render'

export function SceneView({ scene, className }: { scene: SketchScene; className?: string }) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sceneToSvg(scene) }}
    />
  )
}
