import { describe, expect, it } from 'vitest'
import { sceneToAutoPrompt } from './sketchToPrompt'
import { templateForImage } from './sketch/templates'
import type { ImageDef } from './types'

const image: ImageDef = {
  image_id: 'C04',
  group: 'character_space',
  difficulty: 'medium',
  primary_target: ['relation'],
  secondary_target: ['spatial'],
  target_dimensions: ['relation', 'spatial'],
  image_path: 'data/tasks/images/character_space/C04.png',
  title: '街角三人',
  source_id: 'IMG09',
  ground_truth: {
    nodes: [
      { id: 'person_01', label: '近处的人', kind: 'person' },
      { id: 'person_02', label: '中间的人', kind: 'person' },
      { id: 'person_03', label: '远处的人', kind: 'person' },
      { id: 'camera', label: '镜头', kind: 'camera' },
    ],
    relations: [{ from: '中间的人', relation: '面向', to: '近处的人' }],
  },
}

describe('sceneToAutoPrompt', () => {
  it('describes people and camera in everyday Chinese, not shot jargon', () => {
    const scene = templateForImage(image)
    scene.subjects[2].x = 620
    scene.subjects[2].y = 210
    const text = sceneToAutoPrompt(scene, 'zh')
    expect(text).toMatch(/人物/)
    expect(text).toMatch(/摄影机/)
    expect(text).not.toMatch(/Over-the-shoulder|Dutch angle|cinematic/i)
    expect(sceneToAutoPrompt.length).toBeLessThanOrEqual(3)
  })

  it('mentions increased distance when people move farther apart', () => {
    const base = templateForImage(image)
    const moved = structuredClone(base)
    moved.subjects[moved.subjects.length - 1].x += 220
    const text = sceneToAutoPrompt(moved, 'zh', base)
    expect(text).toMatch(/拉开/)
  })
})
