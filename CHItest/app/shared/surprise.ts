import { stimulusUrl } from './config'

/** Replace public/surprise/surprise.svg with the final image when it arrives. */
export const SURPRISE_ASSET = 'surprise/surprise.svg'

export async function downloadSurpriseAsset(): Promise<void> {
  const filename = SURPRISE_ASSET.split('/').pop() || 'surprise'
  const res = await fetch(stimulusUrl(SURPRISE_ASSET))
  if (!res.ok) throw new Error('Surprise image is missing')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
