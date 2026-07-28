import { AppHeader } from './components/AppHeader'
import { AppNavigation } from './components/AppNavigation'
import { useHashRoute } from './hooks/useHashRoute'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export function App() {
  const { activeRoute, navigate } = useHashRoute()

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="app-content" id="main-content">
        {activeRoute === 'inicio' ? (
          <HomePage onNavigate={navigate} />
        ) : (
          <PlaceholderPage route={activeRoute} onNavigate={navigate} />
        )}
      </main>

      <AppNavigation activeRoute={activeRoute} onNavigate={navigate} />
    </div>
  )
}
