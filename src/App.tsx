import { AppHeader } from './components/AppHeader'
import { AppNavigation } from './components/AppNavigation'
import { useDemoRole } from './hooks/useDemoRole'
import { useHashRoute } from './hooks/useHashRoute'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilePage } from './pages/ProfilePage'

export function App() {
  const { activeRoute, navigate } = useHashRoute()
  const { activeRole, setActiveRole, resetRole } = useDemoRole()

  return (
    <div className="app-shell">
      <AppHeader activeRole={activeRole} />

      <main className="app-content" id="main-content">
        {activeRoute === 'inicio' ? (
          <HomePage onNavigate={navigate} />
        ) : activeRoute === 'perfil' ? (
          <ProfilePage
            activeRole={activeRole}
            onRoleChange={setActiveRole}
            onReset={resetRole}
          />
        ) : (
          <PlaceholderPage route={activeRoute} onNavigate={navigate} />
        )}
      </main>

      <AppNavigation activeRoute={activeRoute} onNavigate={navigate} />
    </div>
  )
}
