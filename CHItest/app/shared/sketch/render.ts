import type { GazeNode, MovementNode, SketchScene } from '../types'
import { nodeCenter } from './actions'

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function arrowPoints(from: { x: number; y: number }, to: { x: number; y: number }, dashed: boolean): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const endX = to.x - ux * 8
  const endY = to.y - uy * 8
  const dash = dashed ? ' stroke-dasharray="6 5"' : ''
  const hx = endX - ux * 10 + -uy * 5
  const hy = endY - uy * 10 + ux * 5
  const hx2 = endX - ux * 10 + uy * 5
  const hy2 = endY - uy * 10 - ux * 5
  return `<line x1="${from.x}" y1="${from.y}" x2="${endX}" y2="${endY}" fill="none" stroke="#000" stroke-width="1.5"${dash} />
    <polyline points="${hx},${hy} ${endX},${endY} ${hx2},${hy2}" fill="none" stroke="#000" stroke-width="1.5" />`
}

function gazeTarget(scene: SketchScene, gaze: GazeNode): { x: number; y: number } | null {
  if (gaze.toId) return nodeCenter(scene, gaze.toId)
  return gaze.to
}

function movementFrom(scene: SketchScene, move: MovementNode): { x: number; y: number } | null {
  return nodeCenter(scene, move.from)
}

export function sceneToSvg(scene: SketchScene): string {
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" width="${scene.width}" height="${scene.height}">`,
  )
  parts.push(`<rect width="${scene.width}" height="${scene.height}" fill="#fff" stroke="#000" stroke-width="2" />`)
  parts.push('<line x1="0" y1="150" x2="800" y2="150" stroke="#000" stroke-width="0.5" opacity="0.25" />')
  parts.push('<line x1="0" y1="280" x2="800" y2="280" stroke="#000" stroke-width="0.5" opacity="0.25" />')
  parts.push('<text x="8" y="20" font-size="10" fill="#000">BG</text>')
  parts.push('<text x="8" y="170" font-size="10" fill="#000">MG</text>')
  parts.push('<text x="8" y="300" font-size="10" fill="#000">FG</text>')

  for (const object of scene.objects) {
    parts.push(
      `<rect x="${object.x}" y="${object.y}" width="${object.w}" height="${object.h}" fill="none" stroke="#000" stroke-width="1.5" />`,
    )
    parts.push(
      `<text x="${object.x + object.w / 2}" y="${object.y - 6}" text-anchor="middle" font-size="11" fill="#000">${esc(object.label)}</text>`,
    )
  }

  for (const gaze of scene.gazes) {
    const from = nodeCenter(scene, gaze.from)
    const to = gazeTarget(scene, gaze)
    if (from && to) parts.push(arrowPoints(from, to, false))
  }

  for (const move of scene.movements) {
    const from = movementFrom(scene, move)
    if (from) parts.push(arrowPoints(from, move.to, true))
  }

  for (const subject of scene.subjects) {
    const s = subject.scale
    const head = 12 * s
    parts.push(`<g transform="translate(${subject.x} ${subject.y}) rotate(${subject.rotation})">`)
    parts.push(`<circle r="${head}" fill="#fff" stroke="#000" stroke-width="1.5" />`)
    parts.push(`<line x1="${head}" y1="0" x2="${head + 8 * s}" y2="0" stroke="#000" stroke-width="1.5" />`)
    parts.push(`<line x1="0" y1="${head}" x2="0" y2="${40 * s}" stroke="#000" stroke-width="1.5" />`)
    parts.push(
      `<line x1="${-14 * s}" y1="${22 * s}" x2="${14 * s}" y2="${22 * s}" stroke="#000" stroke-width="1.5" />`,
    )
    parts.push(
      `<line x1="0" y1="${40 * s}" x2="${-10 * s}" y2="${62 * s}" stroke="#000" stroke-width="1.5" />`,
    )
    parts.push(
      `<line x1="0" y1="${40 * s}" x2="${10 * s}" y2="${62 * s}" stroke="#000" stroke-width="1.5" />`,
    )
    parts.push('</g>')
    parts.push(
      `<text x="${subject.x}" y="${subject.y + 62 * s + 14}" text-anchor="middle" font-size="12" fill="#000">${esc(subject.label)}</text>`,
    )
  }

  const cam = scene.camera
  parts.push(`<g transform="translate(${cam.x} ${cam.y}) rotate(${cam.rotation})">`)
  parts.push('<polygon points="0,-11 22,0 0,11" fill="#fff" stroke="#000" stroke-width="1.5" />')
  parts.push('</g>')
  parts.push(`<text x="${cam.x}" y="${cam.y + 28}" text-anchor="middle" font-size="11">CAM</text>`)

  parts.push('</svg>')
  return parts.join('\n')
}
