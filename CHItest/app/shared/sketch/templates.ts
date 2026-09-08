import type { ImageDef, SketchScene } from '../types'

export const CANVAS = { width: 800, height: 450 }

function person(id: string, label: string, x: number, y: number, rotation = 0, scale = 1) {
  return { id, label, x, y, rotation, scale }
}

function object(id: string, kind: string, label: string, x: number, y: number, w: number, h: number) {
  return { id, kind, x, y, w, h, label }
}

function emptyScene(): SketchScene {
  return {
    width: CANVAS.width,
    height: CANVAS.height,
    camera: { id: 'camera', x: 90, y: 390, rotation: -28, distance: 1 },
    subjects: [],
    objects: [],
    gazes: [],
    movements: [],
  }
}

export function templateForImage(image: ImageDef): SketchScene {
  const scene = emptyScene()
  const people = image.ground_truth.nodes.filter((node) => node.kind === 'person')
  const objects = image.ground_truth.nodes.filter((node) => node.kind === 'object')
  people.forEach((node, index) => {
    const x = 170 + index * Math.min(180, 520 / Math.max(people.length, 1))
    const y = 320 - index * 18
    const rotation = index === 0 ? 8 : -8
    scene.subjects.push(person(node.id, String.fromCharCode(65 + index), x, y, rotation, 1.1 - index * 0.12))
  })
  objects.forEach((node, index) => {
    scene.objects.push(
      object(node.id, node.kind, node.label, 420 + (index % 3) * 80, 70 + Math.floor(index / 3) * 90, 90, 70),
    )
  })
  image.ground_truth.relations.forEach((rel, index) => {
    if (!rel.relation.includes('看')) return
    const from = image.ground_truth.nodes.find((node) => node.label === rel.from && node.kind === 'person')
    const to = image.ground_truth.nodes.find((node) => node.label === rel.to && node.kind === 'person')
    if (!from) return
    scene.gazes.push({
      id: `gaze_${index + 1}`,
      from: from.id,
      toId: to?.id ?? null,
      to: to ? null : { x: 640, y: 120 },
    })
  })
  if (image.image_id === 'D03' || image.image_id === 'D04') {
    if (scene.subjects[0]) {
      scene.movements.push({
        id: 'movement_01',
        from: scene.subjects[0].id,
        to: { x: scene.subjects[0].x + 160, y: scene.subjects[0].y - 80 },
      })
    }
  }
  if (image.image_id === 'A01') {
    scene.camera = { id: 'camera', x: 120, y: 410, rotation: -55, distance: 1.2 }
  }
  if (image.image_id === 'A03') {
    scene.camera = { id: 'camera', x: 400, y: 60, rotation: 80, distance: 0.8 }
  }
  return scene
}

export function cloneScene(scene: SketchScene): SketchScene {
  return structuredClone(scene)
}
