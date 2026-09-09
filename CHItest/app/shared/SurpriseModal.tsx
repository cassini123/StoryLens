import { stimulusUrl } from './config'
import { downloadSurpriseAsset, SURPRISE_ASSET, surpriseThanks } from './surprise'
import { useI18n } from './i18n'

export function SurpriseModal({
  participantId,
  onClose,
}: {
  participantId: string
  onClose: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="surprise-overlay" role="dialog" aria-label={t.surprise} onClick={onClose}>
      <div className="surprise-poster" onClick={(event) => event.stopPropagation()}>
        <img className="surprise-bg" src={stimulusUrl(SURPRISE_ASSET)} alt="" />
        <p className="surprise-thanks">{surpriseThanks(participantId)}</p>
        <button className="btn btn-fill surprise-download" type="button" onClick={() => void downloadSurpriseAsset()}>
          {t.downloadData}
        </button>
        <button className="btn surprise-close" type="button" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  )
}

export function SurpriseTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button type="button" className="surprise-open" onClick={onClick}>
      {t.surprise}
    </button>
  )
}
