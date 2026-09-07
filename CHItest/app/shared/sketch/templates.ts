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
    objects: [object('object_table', 'table', 'table', 310, 250, 180, 70)],
    subjects: [
      person('person_01', 'A', 280, 330, 20, 1.1),
      person('person_02', 'B', 520, 250, -160, 0.95),
    ],
    camera: { id: 'camera', x: 140, y: 400, rotation: -18 },
    gazes: [{ id: 'gaze_01', from: 'person_02', toId: 'person_01', to: null }],
  }),
  T04: () => ({
    ...emptyScene(),
    objects: [
      object('object_shelf_l', 'shelf', 'shelf', 180, 90, 40, 220),
      object('object_shelf_r', 'shelf', 'shelf', 560, 90, 40, 220),
    ],
    subjects: [
      person('person_01', 'A', 260, 320, 10, 1.12),
      person('person_02', 'B', 520, 240, -170, 0.92),
    ],
    camera: { id: 'camera', x: 90, y: 400, rotation: -22 },
    gazes: [{ id: 'gaze_01', from: 'person_02', toId: 'person_01', to: null }],
  }),
  T05: () => ({
    ...emptyScene(),
    objects: [object('object_seat', 'seat', 'seat', 540, 230, 90, 40)],
    subjects: [
      person('person_01', 'A', 180, 330, 8, 1.12),
      person('person_02', 'B', 580, 220, -170, 0.88),
    ],
    camera: { id: 'camera', x: 80, y: 400, rotation: -26 },
    movements: [{ id: 'movement_01', from: 'person_01', to: { x: 460, y: 250 } }],
  }),
  T06: () => ({
    ...emptyScene(),
    objects: [object('object_pillar', 'pillar', 'pillar', 600, 80, 36, 220)],
    subjects: [
      person('person_01', 'A', 170, 330, 6, 1.12),
      person('person_02', 'B', 620, 230, -160, 0.9),
    ],
    camera: { id: 'camera', x: 80, y: 405, rotation: -24 },
    movements: [{ id: 'movement_01', from: 'person_01', to: { x: 500, y: 250 } }],
  }),
  T07: () => ({
    ...emptyScene(),
    objects: [object('object_door', 'door', 'door', 370, 70, 46, 120)],
    subjects: [
      person('person_01', 'A', 250, 350, 6, 1.3),
      person('person_02', 'B', 400, 160, 0, 0.62),
    ],
    camera: { id: 'camera', x: 70, y: 410, rotation: -10 },
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
