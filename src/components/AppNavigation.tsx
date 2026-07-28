import { navigationItems, type AppRoute } from '../app/navigation'

type AppNavigationProps = {
  activeRoute: AppRoute
  onNavigate: (route: AppRoute) => void
}

export function AppNavigation({ activeRoute, onNavigate }: AppNavigationProps) {
  return (
    <nav className="app-navigation" aria-label="Navegación principal">
      {navigationItems.map(({ id, icon: Icon, label }) => {
        const isActive = activeRoute === id

        return (
          <a
            className="navigation-link"
            href={`#${id}`}
            key={id}
            aria-current={isActive ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              onNavigate(id)
            }}
          >
            <Icon aria-hidden="true" size={21} strokeWidth={2} />
            <span>{label}</span>
          </a>
        )
      })}
    </nav>
  )
}
