import { useEffect, useState } from 'react'
import { CodingApp } from './coding/CodingApp'
import { ExpertApp } from './expert/ExpertApp'
import { ExportApp } from './export/ExportApp'
import { Home } from './Home'
import { ParticipantApp } from './participant/ParticipantApp'
import { isResearcherAuthed } from './shared/auth'
import { LocaleProvider } from './shared/i18n'
import type { AppRoute } from './shared/types'

function routeFromHash(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash.startsWith('participant')) return 'participant'
  if (hash.startsWith('expert')) return 'expert'
  if (hash.startsWith('coding')) return 'coding'
  if (hash.startsWith('export')) return 'export'
  return 'home'
}

const RESEARCHER_ROUTES: AppRoute[] = ['expert', 'coding', 'export']

export function App() {
  const [route, setRoute] = useState<AppRoute>(routeFromHash)
  const [authed, setAuthed] = useState(() => isResearcherAuthed())

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    const onAuth = () => setAuthed(isResearcherAuthed())
    window.addEventListener('hashchange', onHash)
    window.addEventListener('chitest-auth', onAuth)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('chitest-auth', onAuth)
    }
  }, [])

  const needsResearcher = RESEARCHER_ROUTES.includes(route)
  const screen =
    route === 'participant' ? (
      <ParticipantApp />
    ) : needsResearcher && !authed ? (
      <Home startResearcher />
    ) : route === 'expert' ? (
      <ExpertApp />
    ) : route === 'coding' ? (
      <CodingApp />
    ) : route === 'export' ? (
      <ExportApp />
    ) : (
      <Home />
    )

  return <LocaleProvider>{screen}</LocaleProvider>
}
