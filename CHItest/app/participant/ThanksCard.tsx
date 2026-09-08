import { useEffect, useRef, useState } from 'react'
import { stimulusUrl } from '../shared/config'
import { LangSwitch, useI18n } from '../shared/i18n'
import {
  THANKS_BG_PATH,
  canvasToBlob,
  downloadBlob,
  paintThanksCard,
  thanksMessage,
} from '../shared/thanksCard'

export function ThanksCard({
  participantId,
  onClose,
  onDownload,
}: {
  participantId: string
  onClose: () => void
  onDownload?: (kind: 'png' | 'jpg') => void
}) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const text = thanksMessage(participantId, locale)

  useEffect(() => {
    const id = window.setTimeout(() => setOpen(true), 40)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save(kind: 'png' | 'jpg') {
    const img = imgRef.current
    if (!img || busy) return
    setBusy(true)
    try {
      if (!img.complete) await img.decode()
      const canvas = await paintThanksCard(img, text, img.naturalWidth || 1536, img.naturalHeight || 1024)
      const blob = await canvasToBlob(canvas, kind === 'png' ? 'image/png' : 'image/jpeg')
      downloadBlob(`${participantId}-thanks.${kind === 'png' ? 'png' : 'jpg'}`, blob)
      onDownload?.(kind)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="thanks-backdrop" role="dialog" aria-modal="true" aria-label={t.thanksCardTitle}>
      <button className="thanks-scrim" type="button" aria-label={t.thanksClose} onClick={onClose} />
      <div className={`thanks-card ${open ? 'open' : ''}`}>
        <div className="thanks-stage">
          <img ref={imgRef} className="thanks-bg" src={stimulusUrl(THANKS_BG_PATH)} alt="" />
          <div className={`thanks-caption ${open ? 'on' : ''}`}>
            <span>{text}</span>
          </div>
        </div>
        <div className="thanks-actions">
          <button className="btn" type="button" disabled={busy} onClick={() => void save('png')}>
            {t.thanksDownloadPng}
          </button>
          <button className="btn" type="button" disabled={busy} onClick={() => void save('jpg')}>
            {t.thanksDownloadJpg}
          </button>
          <button className="btn btn-fill" type="button" onClick={onClose}>
            {t.thanksClose}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ThanksPreview() {
  const { t } = useI18n()
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
  const participantId = (params.get('id') || 'P001').trim()
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-leading">
          <LangSwitch />
          <div>
            <div className="brand">{t.studyBrand}</div>
            <div className="sub">{t.thanksCardTitle}</div>
            <div className="meta">{participantId}</div>
          </div>
        </div>
      </header>
      <ThanksCard
        participantId={participantId}
        onClose={() => {
          window.location.hash = '#/participant'
        }}
      />
    </div>
  )
}
