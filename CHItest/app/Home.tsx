import { useEffect, useState } from 'react'
import { experiment } from './shared/config'
import { isResearcherAuthed, loginResearcher, logoutResearcher, researcherName } from './shared/auth'
import { useI18n } from './shared/i18n'
import { checkJimengHealth, type JimengHealth } from './shared/jimeng'
import { Button, Field, Shell } from './shared/ui'

export function Home({ startResearcher = false }: { startResearcher?: boolean }) {
  const { t } = useI18n()
  const [health, setHealth] = useState<JimengHealth | null>(null)
  const [researcherOpen, setResearcherOpen] = useState(() => isResearcherAuthed())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [researcher, setResearcher] = useState(researcherName)
  const showResearcher = startResearcher || researcherOpen

  useEffect(() => {
    void checkJimengHealth().then(setHealth)
  }, [])

  const apiReady = Boolean(health?.credentials)
  const apiLabel = !health ? t.apiChecking : apiReady ? t.apiReady : t.apiMissing

  function submitLogin() {
    if (loginResearcher(username.trim(), password)) {
      setResearcher(researcherName())
      setLoginError('')
      setPassword('')
      return
    }
    setLoginError(t.loginFailed)
  }

  return (
    <Shell title={experiment.study.title} subtitle={experiment.study.subtitle}>
      <main className="page">
        <p className="lead">{t.homeLead}</p>
        <p>{t.homeBody}</p>
        <p className={apiReady ? 'api-status ok' : 'api-status bad'}>{apiLabel}</p>
        <div className="stack">
          <Button fill onClick={() => (window.location.hash = '#/participant')}>
            {t.participant}
          </Button>
          <Button
            onClick={() => {
              setResearcherOpen(true)
              setResearcher(researcherName())
            }}
          >
            {t.researcher}
          </Button>
        </div>
        {showResearcher ? (
          researcher ? (
            <div className="stack researcher-panel">
              <p className="meta">{researcher}</p>
              <Button onClick={() => (window.location.hash = '#/expert')}>{t.expert}</Button>
              <Button onClick={() => (window.location.hash = '#/coding')}>{t.coding}</Button>
              <Button onClick={() => (window.location.hash = '#/export')}>{t.exportPage}</Button>
              <Button
                onClick={() => {
                  logoutResearcher()
                  setResearcher(null)
                  setUsername('')
                  setPassword('')
                }}
              >
                {t.logout}
              </Button>
            </div>
          ) : (
            <form
              className="stack researcher-panel"
              onSubmit={(event) => {
                event.preventDefault()
                submitLogin()
              }}
            >
              <Field label={t.username}>
                <input
                  autoComplete="username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    setLoginError('')
                  }}
                />
              </Field>
              <Field label={t.password}>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setLoginError('')
                  }}
                />
              </Field>
              {loginError ? <p className="api-status bad">{loginError}</p> : null}
              <Button fill type="submit">
                {t.login}
              </Button>
            </form>
          )
        ) : null}
      </main>
    </Shell>
  )
}
