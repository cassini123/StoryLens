import { useEffect, useState } from 'react'
import { CodingApp } from './coding/CodingApp'
import { ExpertApp } from './expert/ExpertApp'
import { ExportApp } from './export/ExportApp'
import { Home } from './Home'
import { ParticipantApp } from './participant/ParticipantApp'
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

export function App() {
  const [route, setRoute] = useState<AppRoute>(routeFromHash)

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const screen =
    route === 'participant' ? (
      <ParticipantApp />
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
