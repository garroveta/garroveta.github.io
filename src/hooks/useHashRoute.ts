import { useCallback, useEffect, useState } from 'react'

import { isAppRoute, type AppRoute } from '../app/navigation'

function getRouteFromHash(): AppRoute {
  const route = window.location.hash.replace('#', '')
  return isAppRoute(route) ? route : 'inicio'
}

export function useHashRoute() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(getRouteFromHash)

  useEffect(() => {
    const handleHashChange = () => {
      setActiveRoute(getRouteFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = useCallback((route: AppRoute) => {
    setActiveRoute(route)

    if (window.location.hash !== `#${route}`) {
      window.location.hash = route
    }
  }, [])

  return { activeRoute, navigate }
}
