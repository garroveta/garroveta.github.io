import { AppHeader } from './components/AppHeader'
import { AppNavigation } from './components/AppNavigation'
import { demoData, getDemoDataSummary } from './data/demoData'
import { useDemoRole } from './hooks/useDemoRole'
import { useHashRoute } from './hooks/useHashRoute'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilePage } from './pages/ProfilePage'

function getCurrentMember() {
  const member = demoData.members.find(
    ({ id }) => id === demoData.currentMemberId,
  )

  if (!member) {
    throw new Error('No se ha encontrado el miembro activo de demostración.')
  }

  return member
}

const currentMember = getCurrentMember()
const dataSummary = getDemoDataSummary()

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
            community={demoData.community}
            currentMember={currentMember}
            dataSummary={dataSummary}
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
