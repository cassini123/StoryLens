import { useEffect, useState } from 'react'
import { experiment } from './shared/config'
import { useI18n } from './shared/i18n'
import { checkJimengHealth, type JimengHealth } from './shared/jimeng'
import { Button, Shell } from './shared/ui'

export function Home() {
  const { t } = useI18n()
  const [health, setHealth] = useState<JimengHealth | null>(null)

  useEffect(() => {
    void checkJimengHealth().then(setHealth)
  }, [])

  const apiReady = Boolean(health?.credentials)
  const apiLabel = !health ? t.apiChecking : apiReady ? t.apiReady : health.error || t.apiMissing

  return (
    <Shell title={experiment.study.title} subtitle={experiment.study.subtitle}>
      <main className="page">
        <p className="lead">{t.homeLead}</p>
        <p>{t.homeBody}</p>
        <p className={apiReady ? 'api-status ok' : 'api-status bad'}>{apiLabel}</p>
        {!apiReady && health ? <p className="hint">{t.apiHint}</p> : null}
        <div className="stack">
          <Button fill onClick={() => (window.location.hash = '#/participant')}>
            {t.participant}
          </Button>
          <Button onClick={() => (window.location.hash = '#/expert')}>{t.expert}</Button>
          <Button onClick={() => (window.location.hash = '#/coding')}>{t.coding}</Button>
          <Button onClick={() => (window.location.hash = '#/export')}>{t.exportPage}</Button>
        </div>
      </main>
    </Shell>
  )
}
