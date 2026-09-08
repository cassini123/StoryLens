import type { Locale } from './i18n'

export const THANKS_BG_PATH = 'thanks/thanks-card-bg.jpg'

export const THANKS_FONT_STACK =
  '"DIN Alternate", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", "Noto Sans SC", sans-serif'

/** Layout as fractions of the background image. Replace the jpg to swap art; keep the lower band free. */
export const THANKS_LAYOUT = {
  bandTop: 0.78,
  side: 0.07,
  padX: 0.018,
  padY: 0.014,
  font: 0.023,
  line: 1.35,
  maxLines: 2,
}

export function thanksMessage(participantId: string, locale: Locale): string {
  const id = participantId.trim() || 'P000'
  if (locale === 'zh') return `Hi ${id}，很荣幸邀请您参与我们的实验，非常感谢！`
  return `Hi ${id}, thank you very much for your participation!`
}

export function wrapCaption(text: string, maxWidth: number, measure: (value: string) => number): string[] {
  if (measure(text) <= maxWidth) return [text]
  const chars = [...text]
  const lines: string[] = []
  let i = 0
  while (i < chars.length && lines.length < THANKS_LAYOUT.maxLines) {
    let current = ''
    while (i < chars.length) {
      const next = current + chars[i]
      if (current && measure(next) > maxWidth) break
      current = next
      i += 1
    }
    if (!current) {
      current = chars[i] ?? ''
      i += 1
    }
    if (lines.length === THANKS_LAYOUT.maxLines - 1 && i < chars.length) {
      lines.push(current)
      return lines
    }
    lines.push(current)
  }
  return lines
}

export function layoutCaptionBox(
  text: string,
  imageWidth: number,
  imageHeight: number,
  measure: (value: string) => number,
): { x: number; y: number; width: number; height: number; lines: string[]; fontSize: number; lineHeight: number } {
  const maxWidth = imageWidth * (1 - THANKS_LAYOUT.side * 2)
  const padX = imageWidth * THANKS_LAYOUT.padX
  const padY = imageHeight * THANKS_LAYOUT.padY
  const fontSize = imageWidth * THANKS_LAYOUT.font
  const lineHeight = fontSize * THANKS_LAYOUT.line
  const innerMax = Math.max(8, maxWidth - padX * 2)
  const lines = wrapCaption(text, innerMax, measure)
  const content = Math.max(...lines.map((line) => measure(line)), 0)
  const width = Math.min(maxWidth, content + padX * 2)
  const height = lines.length * lineHeight + padY * 2
  const x = (imageWidth - width) / 2
  const y = imageHeight * THANKS_LAYOUT.bandTop - height / 2
  return { x, y, width, height, lines, fontSize, lineHeight }
}

export async function paintThanksCard(
  image: CanvasImageSource,
  text: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(image, 0, 0, width, height)
  try {
    await document.fonts.load(`500 ${Math.round(width * THANKS_LAYOUT.font)}px ${THANKS_FONT_STACK}`)
    await document.fonts.ready
  } catch {
    /* system fallback */
  }
  const fontSize = width * THANKS_LAYOUT.font
  ctx.font = `500 ${fontSize}px ${THANKS_FONT_STACK}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  const box = layoutCaptionBox(text, width, height, (value) => ctx.measureText(value).width)
  ctx.fillStyle = '#000'
  ctx.fillRect(box.x, box.y, box.width, box.height)
  ctx.fillStyle = '#fff'
  const startY = box.y + (box.height - box.lines.length * box.lineHeight) / 2 + box.lineHeight / 2
  box.lines.forEach((line, index) => {
    ctx.fillText(line, box.x + box.width / 2, startY + index * box.lineHeight)
  })
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('encode'))
        else resolve(blob)
      },
      type,
      quality,
    )
  })
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
