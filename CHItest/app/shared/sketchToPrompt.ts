import type { Locale } from './i18n'
import { CANVAS } from './sketch/templates'
import type { SketchScene, SubjectNode } from './types'

function labelOf(subject: SubjectNode, index: number): string {
  return subject.label || String.fromCharCode(65 + index)
}

function side(x: number): 'left' | 'center' | 'right' {
  if (x < CANVAS.width * 0.38) return 'left'
  if (x > CANVAS.width * 0.62) return 'right'
  return 'center'
}

function depth(y: number): 'front' | 'middle' | 'back' {
  if (y > CANVAS.height * 0.62) return 'front'
  if (y < CANVAS.height * 0.38) return 'back'
  return 'middle'
}

function dist(a: SubjectNode, b: SubjectNode): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function relativePlace(from: SubjectNode, to: SubjectNode, locale: Locale): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const behind = dy < -24
  const ahead = dy > 24
  const right = dx > 36
  const left = dx < -36
  if (locale === 'zh') {
    if (behind && right) return '右后方'
    if (behind && left) return '左后方'
    if (ahead && right) return '右前方'
    if (ahead && left) return '左前方'
    if (behind) return '正后方'
    if (ahead) return '正前方'
    if (right) return '右侧'
    if (left) return '左侧'
    return '附近'
  }
  if (behind && right) return 'rear-right'
  if (behind && left) return 'rear-left'
  if (ahead && right) return 'front-right'
  if (ahead && left) return 'front-left'
  if (behind) return 'directly behind'
  if (ahead) return 'directly in front'
  if (right) return 'to the right of'
  if (left) return 'to the left of'
  return 'near'
}

function cameraPhrase(scene: SketchScene, locale: Locale): string {
  const cam = scene.camera
  const low = cam.y > CANVAS.height * 0.7
  const high = cam.y < CANVAS.height * 0.28
  const left = cam.x < CANVAS.width * 0.4
  const right = cam.x > CANVAS.width * 0.6
  const close = cam.distance < 0.85
  const far = cam.distance > 1.25
  if (locale === 'zh') {
    const height = low ? '较低的位置' : high ? '较高的位置' : '接近视线高度'
    const sideWord = left ? '偏左' : right ? '偏右' : '大致正面'
    const distWord = close ? '靠近场景' : far ? '离场景较远' : '保持适中距离'
    const rear = cam.rotation < -20 || cam.rotation > 20 ? '从侧后方观察' : '朝向场景观察'
    return `摄影机在${height}、${sideWord}，${distWord}，${rear}`
  }
  const height = low ? 'from a lower position' : high ? 'from a higher position' : 'near eye height'
  const sideWord = left ? 'on the left' : right ? 'on the right' : 'roughly in front'
  const distWord = close ? 'closer to the scene' : far ? 'farther from the scene' : 'at a moderate distance'
  const rear = cam.rotation < -20 || cam.rotation > 20 ? 'looking from the rear side' : 'facing the scene'
  return `The camera is ${height}, ${sideWord}, ${distWord}, ${rear}`
}

export function sceneToAutoPrompt(scene: SketchScene, locale: Locale = 'zh', baseline?: SketchScene | null): string {
  const people = [...scene.subjects]
  if (people.length === 0) {
    return locale === 'zh'
      ? '调整画面中的人物位置、相互距离，以及摄影机的观察角度。'
      : 'Adjust the people’s positions and distances, and the camera’s viewing angle.'
  }
  const sorted = [...people].sort((a, b) => a.x - b.x)
  const parts: string[] = []

  if (sorted.length >= 2) {
    const left = sorted[0]
    const right = sorted[sorted.length - 1]
    const gap = dist(left, right)
    const place = relativePlace(left, right, locale)
    const baselineGap =
      baseline && baseline.subjects.length >= 2
        ? dist(
            [...baseline.subjects].sort((a, b) => a.x - b.x)[0],
            [...baseline.subjects].sort((a, b) => a.x - b.x).at(-1)!,
          )
        : null
    const farther = baselineGap != null && gap > baselineGap + 28
    const closer = baselineGap != null && gap < baselineGap - 28
    if (locale === 'zh') {
      const distance = farther ? '并明显拉开他们之间的距离' : closer ? '并缩短他们之间的距离' : '并保持人物之间的间距'
      parts.push(`将人物${labelOf(right, people.indexOf(right))}移到人物${labelOf(left, people.indexOf(left))}的${place}，${distance}`)
    } else {
      const distance = farther
        ? 'and increase the space between them'
        : closer
          ? 'and reduce the space between them'
          : 'keeping space between them'
      parts.push(
        `Move person ${labelOf(right, people.indexOf(right))} to the ${place} person ${labelOf(left, people.indexOf(left))}, ${distance}`,
      )
    }
  }

  if (sorted.length >= 3) {
    const mid = sorted[Math.floor(sorted.length / 2)]
    if (locale === 'zh') {
      parts.push(`让人物${labelOf(mid, people.indexOf(mid))}处在另外两个人之间，前后层次更清楚`)
    } else {
      parts.push(`Keep person ${labelOf(mid, people.indexOf(mid))} between the others, with a clearer front-to-back layer`)
    }
  }

  const front = people.filter((item) => depth(item.y) === 'front')
  if (front.length && locale === 'zh') {
    parts.push(`让${front.map((item) => `人物${labelOf(item, people.indexOf(item))}`).join('、')}更靠近画面前方`)
  } else if (front.length) {
    parts.push(
      `Bring ${front.map((item) => `person ${labelOf(item, people.indexOf(item))}`).join(', ')} closer to the foreground`,
    )
  }

  const gazes = scene.gazes
  if (gazes[0]) {
    const from = people.find((item) => item.id === gazes[0].from)
    const to = people.find((item) => item.id === gazes[0].toId)
    if (from && to) {
      parts.push(
        locale === 'zh'
          ? `人物${labelOf(from, people.indexOf(from))}看向人物${labelOf(to, people.indexOf(to))}`
          : `Person ${labelOf(from, people.indexOf(from))} looks toward person ${labelOf(to, people.indexOf(to))}`,
      )
    }
  }

  parts.push(cameraPhrase(scene, locale))

  if (scene.objects[0]) {
    const obj = scene.objects[0]
    const place = side(obj.x)
    parts.push(
      locale === 'zh'
        ? `把${obj.label || '主要物体'}放在画面${place === 'left' ? '左侧' : place === 'right' ? '右侧' : '中部'}`
        : `Place the ${obj.label || 'main object'} on the ${place} of the frame`,
    )
  }

  const text = parts.filter(Boolean).join(locale === 'zh' ? '；' : '. ')
  return locale === 'zh' ? `${text}。` : `${text}.`
}
