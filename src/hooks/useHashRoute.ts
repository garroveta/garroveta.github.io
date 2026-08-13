import { useCallback, useEffect, useState } from 'react'

import { isAppRoute, type AppRoute } from '../app/navigation'

function getRouteFromHash(): AppRoute {
  const route = window.location.hash.replace('#', '').split('?')[0]
  return isAppRoute(route) ? route : 'inicio'
}

function getQueryFromHash() {
  return window.location.hash.split('?')[1] ?? ''
}

export function useHashRoute() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(getRouteFromHash)
  const [routeQuery, setRouteQuery] = useState(getQueryFromHash)

  useEffect(() => {
    const handleHashChange = () => {
      setActiveRoute(getRouteFromHash())
      setRouteQuery(getQueryFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = useCallback((route: AppRoute) => {
    setActiveRoute(route)
    setRouteQuery('')

    if (window.location.hash !== `#${route}`) {
      window.location.hash = route
    }
  }, [])

  return { activeRoute, routeQuery, navigate }
}
