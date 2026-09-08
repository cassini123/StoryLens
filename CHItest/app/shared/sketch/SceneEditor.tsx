import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Point, SketchAction, SketchScene } from '../types'
import { applySketchAction, decorateAction, logOnlyAction, nodeCenter } from './actions'

type Tool = 'select' | 'add_person' | 'add_object' | 'add_gaze' | 'add_movement'

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: clientX, y: clientY }
  const loc = pt.matrixTransform(ctm.inverse())
  return { x: loc.x, y: loc.y }
}

function hitTest(scene: SketchScene, point: Point): string | null {
  const cam = scene.camera
  if (Math.hypot(point.x - cam.x, point.y - cam.y) < 22) return 'camera'
  for (let i = scene.subjects.length - 1; i >= 0; i -= 1) {
    const subject = scene.subjects[i]
    if (Math.hypot(point.x - subject.x, point.y - subject.y) < 28 * subject.scale) return subject.id
  }
  for (let i = scene.objects.length - 1; i >= 0; i -= 1) {
    const object = scene.objects[i]
    if (
      point.x >= object.x &&
      point.x <= object.x + object.w &&
      point.y >= object.y &&
      point.y <= object.y + object.h
    ) {
      return object.id
    }
  }
  for (const gaze of [...scene.gazes].reverse()) {
    const from = nodeCenter(scene, gaze.from)
    const to = gaze.toId ? nodeCenter(scene, gaze.toId) : gaze.to
    if (!from || !to) continue
    const d = distToSegment(point, from, to)
    if (d < 8) return gaze.id
  }
  for (const move of [...scene.movements].reverse()) {
    const from = nodeCenter(scene, move.from)
    if (!from) continue
    if (distToSegment(point, from, move.to) < 8) return move.id
  }
  return null
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = dx * dx + dy * dy
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function emit(
  scene: SketchScene,
  action: { action: string; target: string; from?: unknown; to?: unknown },
): { scene: SketchScene; action: SketchAction } {
  return decorateAction(scene, action)
}

function previewPatch(action: string, target: string, to: unknown): SketchAction {
  return {
    action,
    action_type: action,
    target,
    target_id: target,
    to,
    timestamp: 0,
    before_state: null,
    after_state: null,
  }
}

function previewMove(scene: SketchScene, id: string, point: Point): SketchScene {
  if (id === 'camera') return applySketchAction(scene, previewPatch('camera_move', 'camera', point))
  if (scene.subjects.some((item) => item.id === id)) {
    return applySketchAction(scene, previewPatch('move', id, point))
  }
  const object = scene.objects.find((item) => item.id === id)
  if (object) {
    return applySketchAction(
      scene,
      previewPatch('move_object', id, { x: point.x - object.w / 2, y: point.y - object.h / 2 }),
    )
  }
  if (scene.movements.some((item) => item.id === id)) {
    return applySketchAction(scene, previewPatch('movement_update', id, point))
  }
  return scene
}

export function SceneEditor({
  scene,
  onChange,
  disabled,
}: {
  scene: SketchScene
  onChange: (scene: SketchScene, action?: SketchAction) => void
  disabled?: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; origin: Point; from: Point } | null>(null)
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)

  function commit(next: { scene: SketchScene; action: SketchAction }) {
    onChange(next.scene, next.action)
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (disabled) return
    const svg = svgRef.current
    if (!svg) return
    const point = clientToSvg(svg, event.clientX, event.clientY)
    svg.setPointerCapture(event.pointerId)

    if (tool === 'add_person') {
      commit(emit(scene, { action: 'add', target: 'person', to: point }))
      setTool('select')
      return
    }
    if (tool === 'add_object') {
      commit(emit(scene, { action: 'add_object', target: 'object', to: point }))
      setTool('select')
      return
    }

    const hit = hitTest(scene, point)

    if (tool === 'add_gaze') {
      if (!pendingFrom) {
        if (hit && scene.subjects.some((item) => item.id === hit)) setPendingFrom(hit)
        return
      }
      const toId = hit && scene.subjects.some((item) => item.id === hit) ? hit : null
      commit(
        emit(scene, {
          action: 'gaze_add',
          target: pendingFrom,
          to: { toId, to: toId ? null : point },
        }),
      )
      setPendingFrom(null)
      setTool('select')
      return
    }

    if (tool === 'add_movement') {
      if (!pendingFrom) {
        if (hit && scene.subjects.some((item) => item.id === hit)) setPendingFrom(hit)
        return
      }
      commit(emit(scene, { action: 'movement_add', target: pendingFrom, to: point }))
      setPendingFrom(null)
      setTool('select')
      return
    }

    if (hit) {
      setSelected(hit)
      const from = nodeCenter(scene, hit) ?? point
      setDrag({ id: hit, origin: from, from })
    } else {
      setSelected(null)
    }
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (disabled || !drag) return
    const svg = svgRef.current
    if (!svg) return
    const point = clientToSvg(svg, event.clientX, event.clientY)
    onChange(previewMove(scene, drag.id, point))
    setDrag({ ...drag, from: point })
  }

  function onPointerUp() {
    if (drag) {
      const point = drag.from
      const moved =
        Math.abs(point.x - drag.origin.x) > 1 || Math.abs(point.y - drag.origin.y) > 1
      if (moved) {
        if (drag.id === 'camera') {
          onChange(scene, logOnlyAction(scene, { action: 'camera_move', target: 'camera', from: drag.origin, to: point }))
        } else if (scene.subjects.some((item) => item.id === drag.id)) {
          onChange(scene, logOnlyAction(scene, { action: 'move', target: drag.id, from: drag.origin, to: point }))
        } else if (scene.objects.some((item) => item.id === drag.id)) {
          onChange(scene, logOnlyAction(scene, { action: 'move_object', target: drag.id, from: drag.origin, to: point }))
        } else if (scene.movements.some((item) => item.id === drag.id)) {
          onChange(scene, logOnlyAction(scene, { action: 'movement_update', target: drag.id, from: drag.origin, to: point }))
        }
      }
    }
    setDrag(null)
  }

  function rotateSelected(delta: number) {
    if (!selected || disabled) return
    if (selected === 'camera') {
      commit(
        emit(scene, {
          action: 'camera_rotate',
          target: 'camera',
          from: scene.camera.rotation,
          to: scene.camera.rotation + delta,
        }),
      )
      return
    }
    const subject = scene.subjects.find((item) => item.id === selected)
    if (!subject) return
    commit(
      emit(scene, {
        action: 'rotate',
        target: selected,
        from: subject.rotation,
        to: subject.rotation + delta,
      }),
    )
  }

  function deleteSelected() {
    if (!selected || disabled) return
    if (selected === 'camera') return
    if (scene.subjects.some((item) => item.id === selected)) {
      commit(emit(scene, { action: 'delete', target: selected }))
    } else if (scene.objects.some((item) => item.id === selected)) {
      commit(emit(scene, { action: 'delete_object', target: selected }))
    } else if (scene.gazes.some((item) => item.id === selected)) {
      commit(emit(scene, { action: 'gaze_delete', target: selected }))
    } else if (scene.movements.some((item) => item.id === selected)) {
      commit(emit(scene, { action: 'movement_delete', target: selected }))
    }
    setSelected(null)
  }

  const hint =
    tool === 'add_gaze' && !pendingFrom
      ? 'Click a person, then click another person or a point.'
      : tool === 'add_gaze'
        ? 'Now click the gaze target.'
        : tool === 'add_movement' && !pendingFrom
          ? 'Click a person, then click where they move.'
          : tool === 'add_movement'
            ? 'Now click the movement destination.'
            : tool === 'add_person'
              ? 'Click on the frame to place a person.'
              : tool === 'add_object'
                ? 'Click on the frame to place an object.'
                : 'Drag to move. Select camera or person to rotate.'

  return (
    <div className="editor">
      <div className="toolbar">
        {(
          [
            ['select', 'Select'],
            ['add_person', 'Add person'],
            ['add_object', 'Add object'],
            ['add_gaze', 'Add gaze'],
            ['add_movement', 'Add movement'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tool === id ? 'btn btn-fill' : 'btn'}
            disabled={disabled}
            onClick={() => {
              setTool(id)
              setPendingFrom(null)
            }}
          >
            {label}
          </button>
        ))}
        <button type="button" className="btn" disabled={disabled || !selected} onClick={() => rotateSelected(-15)}>
          Rotate −15°
        </button>
        <button type="button" className="btn" disabled={disabled || !selected} onClick={() => rotateSelected(15)}>
          Rotate +15°
        </button>
        <button type="button" className="btn" disabled={disabled || !selected || selected === 'camera'} onClick={deleteSelected}>
          Delete
        </button>
      </div>
      <p className="hint">{hint}</p>
      <svg
        ref={svgRef}
        className="frame"
        viewBox={`0 0 ${scene.width} ${scene.height}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <rect width={scene.width} height={scene.height} fill="#fff" stroke="#000" strokeWidth={2} />
        <line x1={0} y1={150} x2={800} y2={150} stroke="#000" strokeWidth={0.5} opacity={0.25} />
        <line x1={0} y1={280} x2={800} y2={280} stroke="#000" strokeWidth={0.5} opacity={0.25} />
        <text x={8} y={20} fontSize={10}>
          BG
        </text>
        <text x={8} y={170} fontSize={10}>
          MG
        </text>
        <text x={8} y={300} fontSize={10}>
          FG
        </text>
        {scene.objects.map((object) => (
          <g key={object.id} opacity={selected === object.id ? 1 : 0.95}>
            <rect
              x={object.x}
              y={object.y}
              width={object.w}
              height={object.h}
              fill={selected === object.id ? '#eee' : 'none'}
              stroke="#000"
              strokeWidth={selected === object.id ? 2.5 : 1.5}
            />
            <text x={object.x + object.w / 2} y={object.y - 6} textAnchor="middle" fontSize={11}>
              {object.label}
            </text>
          </g>
        ))}
        {scene.gazes.map((gaze) => {
          const from = nodeCenter(scene, gaze.from)
          const to = gaze.toId ? nodeCenter(scene, gaze.toId) : gaze.to
          if (!from || !to) return null
          return (
            <line
              key={gaze.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#000"
              strokeWidth={selected === gaze.id ? 3 : 1.5}
              markerEnd="url(#arrow)"
            />
          )
        })}
        {scene.movements.map((move) => {
          const from = nodeCenter(scene, move.from)
          if (!from) return null
          return (
            <line
              key={move.id}
              x1={from.x}
              y1={from.y}
              x2={move.to.x}
              y2={move.to.y}
              stroke="#000"
              strokeWidth={selected === move.id ? 3 : 1.5}
              strokeDasharray="6 5"
              markerEnd="url(#arrow)"
            />
          )
        })}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
          </marker>
        </defs>
        {scene.subjects.map((subject) => (
          <g
            key={subject.id}
            transform={`translate(${subject.x} ${subject.y}) rotate(${subject.rotation})`}
            stroke="#000"
            fill="none"
            strokeWidth={selected === subject.id ? 2.5 : 1.5}
          >
            <circle r={12 * subject.scale} fill="#fff" />
            <line x1={12 * subject.scale} x2={20 * subject.scale} />
            <line y1={12 * subject.scale} y2={40 * subject.scale} />
            <line x1={-14 * subject.scale} y1={22 * subject.scale} x2={14 * subject.scale} y2={22 * subject.scale} />
            <line y1={40 * subject.scale} x2={-10 * subject.scale} y2={62 * subject.scale} />
            <line y1={40 * subject.scale} x2={10 * subject.scale} y2={62 * subject.scale} />
            <text y={76 * subject.scale} textAnchor="middle" fontSize={12} stroke="none" fill="#000">
              {subject.label}
            </text>
          </g>
        ))}
        <g transform={`translate(${scene.camera.x} ${scene.camera.y}) rotate(${scene.camera.rotation})`}>
          <polygon
            points="0,-11 22,0 0,11"
            fill={selected === 'camera' ? '#eee' : '#fff'}
            stroke="#000"
            strokeWidth={selected === 'camera' ? 2.5 : 1.5}
          />
        </g>
        <text x={scene.camera.x} y={scene.camera.y + 28} textAnchor="middle" fontSize={11}>
          CAM
        </text>
      </svg>
      <p className="legend">Camera △ · Person ○ · Object ▭ · Gaze → · Movement dashed → · FG / MG / BG</p>
    </div>
  )
}
