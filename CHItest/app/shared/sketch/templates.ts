import type { SketchScene } from '../types'

export const CANVAS = { width: 800, height: 450 }

function person(
  id: string,
  label: string,
  x: number,
  y: number,
  rotation = 0,
  scale = 1,
) {
  return { id, label, x, y, rotation, scale }
}

function object(
  id: string,
  kind: string,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  return { id, kind, x, y, w, h, label }
}

function emptyScene(): SketchScene {
  return {
    width: CANVAS.width,
    height: CANVAS.height,
    camera: { id: 'camera', x: 90, y: 390, rotation: -28 },
    subjects: [],
    objects: [],
    gazes: [],
    movements: [],
  }
}

const TEMPLATES: Record<string, () => SketchScene> = {
  T01: () => ({
    ...emptyScene(),
    objects: [
      object('object_window', 'window', 'window', 560, 70, 140, 110),
      object('object_door', 'door', 'door', 40, 150, 50, 160),
    ],
    subjects: [
      person('person_01', 'A', 220, 300, 12, 1.15),
      person('person_02', 'B', 620, 210, -10, 0.85),
    ],
    camera: { id: 'camera', x: 110, y: 400, rotation: -32 },
    gazes: [{ id: 'gaze_01', from: 'person_01', toId: 'person_02', to: null }],
  }),
  T02: () => ({
    ...emptyScene(),
    objects: [
      object('object_window', 'window', 'window', 580, 60, 120, 150),
      object('object_wall', 'wall', 'wall', 360, 90, 18, 180),
    ],
    subjects: [
      person('person_01', 'A', 200, 310, 8, 1.15),
      person('person_02', 'B', 640, 200, -8, 0.82),
    ],
    camera: { id: 'camera', x: 100, y: 400, rotation: -30 },
    gazes: [{ id: 'gaze_01', from: 'person_01', toId: 'person_02', to: null }],
  }),
  T03: () => ({
    ...emptyScene(),
    objects: [object('object_glass', 'glass', 'glass', 380, 60, 18, 280)],
    subjects: [
      person('person_01', 'A', 250, 310, 8, 1.12),
      person('person_02', 'B', 560, 240, -170, 0.9),
    ],
    camera: { id: 'camera', x: 90, y: 400, rotation: -22 },
  }),
  T04: () => ({
    ...emptyScene(),
    objects: [
      object('object_shelf_l', 'shelf', 'shelf', 180, 90, 40, 220),
      object('object_door', 'door', 'door', 620, 120, 50, 180),
    ],
    subjects: [
      person('person_01', 'A', 280, 310, 10, 1.12),
      person('person_02', 'B', 680, 250, -170, 0.88),
    ],
    camera: { id: 'camera', x: 90, y: 400, rotation: -22 },
  }),
  T05: () => ({
    ...emptyScene(),
    objects: [object('object_stage', 'stage', 'stage', 420, 90, 220, 70)],
    subjects: [person('person_01', 'A', 200, 330, 12, 1.15)],
    camera: { id: 'camera', x: 80, y: 400, rotation: -26 },
    gazes: [{ id: 'gaze_01', from: 'person_01', toId: null, to: { x: 520, y: 120 } }],
  }),
  T06: () => ({
    ...emptyScene(),
    objects: [object('object_train', 'train', 'train', 480, 80, 240, 90)],
    subjects: [person('person_01', 'A', 180, 330, 10, 1.12)],
    camera: { id: 'camera', x: 80, y: 405, rotation: -24 },
    gazes: [{ id: 'gaze_01', from: 'person_01', toId: null, to: { x: 600, y: 120 } }],
    movements: [{ id: 'movement_01', from: 'person_01', to: { x: 340, y: 250 } }],
  }),
  T07: () => ({
    ...emptyScene(),
    objects: [object('object_door', 'door', 'door', 370, 70, 46, 120)],
    subjects: [
      person('person_01', 'A', 220, 340, 6, 1.2),
      person('person_02', 'B', 400, 160, 0, 0.62),
    ],
    camera: { id: 'camera', x: 70, y: 410, rotation: -10 },
    movements: [{ id: 'movement_01', from: 'person_01', to: { x: 360, y: 200 } }],
  }),
  T08: () => ({
    ...emptyScene(),
    objects: [
      object('object_art_1', 'art', 'art', 300, 70, 50, 80),
      object('object_art_2', 'art', 'art', 430, 70, 50, 80),
      object('object_art_3', 'art', 'art', 560, 70, 50, 80),
    ],
    subjects: [
      person('person_01', 'A', 240, 350, 8, 1.28),
      person('person_02', 'B', 520, 170, -8, 0.64),
    ],
    camera: { id: 'camera', x: 70, y: 410, rotation: -12 },
    movements: [{ id: 'movement_01', from: 'person_01', to: { x: 480, y: 190 } }],
  }),
  T09: () => ({
    ...emptyScene(),
    objects: [object('object_rail', 'rail', 'rail', 80, 210, 640, 18)],
    subjects: [
      person('person_01', 'A', 200, 320, 10, 1.12),
      person('person_02', 'B', 620, 230, -20, 0.88),
    ],
    camera: { id: 'camera', x: 90, y: 400, rotation: -28 },
    gazes: [{ id: 'gaze_01', from: 'person_01', toId: 'person_02', to: null }],
  }),
}

export function templateForTask(taskId: string): SketchScene {
  const factory = TEMPLATES[taskId] ?? TEMPLATES.T01
  return factory()
}

export function cloneScene(scene: SketchScene): SketchScene {
  return structuredClone(scene)
}
