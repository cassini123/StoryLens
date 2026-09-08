import { useEffect, useState } from 'react'
import { CodingApp } from './coding/CodingApp'
import { ExpertApp } from './expert/ExpertApp'
import { ExportApp } from './export/ExportApp'
import { Home } from './Home'
import { ParticipantApp } from './participant/ParticipantApp'
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

  if (route === 'participant') return <ParticipantApp />
  if (route === 'expert') return <ExpertApp />
  if (route === 'coding') return <CodingApp />
  if (route === 'export') return <ExportApp />
  return <Home />
}
