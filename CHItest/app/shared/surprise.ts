import { stimulusUrl } from './config'
import { loadStore } from './store'

export const SURPRISE_ASSET = 'surprise/surprise-bg.jpg'

export function surpriseThanks(participantId: string): string {
  const name = participantId.trim()
  return name
    ? `Hi ${name}, thank you very much for your participation!`
    : 'Hi, thank you very much for your participation!'
}

export function latestCompletedParticipantId(): string | null {
  const sessions = loadStore().sessions
  const done = sessions.filter((item) => item.completed_at)
  if (done.length) return done[done.length - 1]?.participant_id ?? null
  const any = sessions[sessions.length - 1]
  return any?.participant_id ?? null
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
