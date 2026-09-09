import { stimulusUrl } from './config'
import { loadStore } from './store'

export const SURPRISE_ASSET = 'surprise/surprise-bg.jpg'

export function surpriseThanks(participantId: string): string {
  return `Hi ${participantId}, thank you very much for your participation!`
}

export function latestCompletedParticipantId(): string | null {
  const done = loadStore().sessions.filter((item) => item.completed_at)
  return done[done.length - 1]?.participant_id ?? null
}

export async function downloadSurpriseAsset(): Promise<void> {
  const filename = SURPRISE_ASSET.split('/').pop() || 'surprise.jpg'
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
