export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = Array.from({ length: b.length + 1 }, () => 0)
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j]
  }
  return prev[b.length]
}

export function textSimilarity(a: string, b: string): number | null {
  if (!a && !b) return 1
  const max = Math.max(a.length, b.length)
  if (!max) return 1
  return 1 - levenshtein(a, b) / max
}

export function copyRatio(source: string, dest: string): number | null {
  if (!dest.trim()) return null
  if (!source.trim()) return 0
  const a = source
  const b = dest
  const rows = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0))
  let best = 0
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        rows[i][j] = rows[i - 1][j - 1] + 1
        best = Math.max(best, rows[i][j])
      }
    }
  }
  return best / dest.length
}

export function pastedFromAuto(autoPrompt: string, pasted: string): boolean {
  const clip = pasted.trim()
  const auto = autoPrompt.trim()
  if (!clip || !auto) return false
  return auto.includes(clip) || clip.includes(auto)
}
