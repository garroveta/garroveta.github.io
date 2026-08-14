import { AppHeader } from './components/AppHeader'
import { AppNavigation } from './components/AppNavigation'
import type { DemoRole } from './app/demoRoles'
import { getDemoDataSummary } from './data/demoData'
import type { DemoDataSet } from './domain/types'
import { useDemoData } from './hooks/useDemoData'
import { useDemoRole } from './hooks/useDemoRole'
import { useHashRoute } from './hooks/useHashRoute'
import { EventsPage } from './pages/EventsPage'
import { CardsPage } from './pages/CardsPage'
import { HomePage } from './pages/HomePage'
import { NewsPage } from './pages/NewsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilePage } from './pages/ProfilePage'
import { RankingsPage } from './pages/RankingsPage'
import { SharedCardsPage } from './pages/SharedCardsPage'

function getCurrentMember(data: DemoDataSet) {
  const member = data.members.find(({ id }) => id === data.currentMemberId)

  if (!member) {
    throw new Error('No se ha encontrado el miembro activo de demostración.')
  }

  return member
}

function getPublishingMember(data: DemoDataSet, activeRole: DemoRole) {
  const communityRole =
    activeRole === 'gerente'
      ? 'manager'
      : activeRole === 'moderador'
        ? 'moderator'
        : 'player'

  return (
    data.members.find(({ role }) => role === communityRole) ??
    getCurrentMember(data)
  )
}

export function App() {
  const { activeRoute, routeQuery, navigate } = useHashRoute()
  const { activeRole, setActiveRole, resetRole } = useDemoRole()
  const { data, updateData, resetData } = useDemoData()
  const currentMember = getCurrentMember(data)
  const publishingMember = getPublishingMember(data, activeRole)
  const dataSummary = getDemoDataSummary(data)
  const cardRouteParams = new URLSearchParams(routeQuery)
  const sharedCardsMemberId =
    activeRoute === 'cartas' ? cardRouteParams.get('member') : null

  const resetDemo = () => {
    resetRole()
    resetData()
  }

  return (
    <div className="app-shell">
      <AppHeader activeRole={activeRole} />

      <main className="app-content" id="main-content">
        {activeRoute === 'inicio' ? (
          <HomePage
            activeRole={activeRole}
            data={data}
            currentMember={currentMember}
            publishingMember={publishingMember}
            onNavigate={navigate}
          />
        ) : activeRoute === 'eventos' ? (
          <EventsPage
            activeRole={activeRole}
            data={data}
            currentMember={currentMember}
            publishingMember={publishingMember}
            onDataChange={updateData}
          />
        ) : activeRoute === 'ranking' ? (
          <RankingsPage data={data} />
        ) : activeRoute === 'cartas' && sharedCardsMemberId ? (
          <SharedCardsPage
            data={data}
            currentMember={currentMember}
            sellerId={sharedCardsMemberId}
            initialSetCode={cardRouteParams.get('set') ?? undefined}
            initialLanguage={cardRouteParams.get('lang') ?? undefined}
            initialCondition={cardRouteParams.get('condition') ?? undefined}
            onBack={() => navigate('cartas', 'view=market')}
            onDataChange={updateData}
          />
        ) : activeRoute === 'cartas' ? (
          <CardsPage
            data={data}
            currentMember={currentMember}
            initialView={
              cardRouteParams.get('view') === 'market' ? 'market' : undefined
            }
            onDataChange={updateData}
          />
        ) : activeRoute === 'noticias' ? (
          <NewsPage
            activeRole={activeRole}
            data={data}
            currentMember={currentMember}
            publishingMember={publishingMember}
            onDataChange={updateData}
          />
        ) : activeRoute === 'perfil' ? (
          <ProfilePage
            activeRole={activeRole}
            community={data.community}
            games={data.games}
            currentMember={currentMember}
            dataSummary={dataSummary}
            onRoleChange={setActiveRole}
            onDataChange={updateData}
            onReset={resetDemo}
          />
        ) : (
          <PlaceholderPage route={activeRoute} onNavigate={navigate} />
        )}
      </main>

      <AppNavigation activeRoute={activeRoute} onNavigate={navigate} />
    </div>
  )
}
