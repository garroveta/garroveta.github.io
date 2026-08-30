import { AppHeader } from './components/AppHeader'
import { AppNavigation } from './components/AppNavigation'
import type { DemoRole } from './app/demoRoles'
import { getDemoDataSummary } from './data/demoData'
import type { DemoDataSet } from './domain/types'
import { useDemoData } from './hooks/useDemoData'
import { useDemoRole } from './hooks/useDemoRole'
import { useHashRoute } from './hooks/useHashRoute'
import { useCurrentUser } from './hooks/useCurrentUser'
import { EventsPage } from './pages/EventsPage'
import { CardsPage } from './pages/CardsPage'
import { HomePage } from './pages/HomePage'
import { NewsPage } from './pages/NewsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilePage } from './pages/ProfilePage'
import { RankingsPage } from './pages/RankingsPage'
import { RegistrationPage } from './pages/RegistrationPage'
import { SharedCardsPage } from './pages/SharedCardsPage'
import { SettingsPage } from './pages/SettingsPage'
import { AccessPage } from './pages/AccessPage'
import { isSettingsSection } from './pages/settingsSections'

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
  const currentUser = useCurrentUser()
  const currentMember = getCurrentMember(data)
  const approvedMembership = currentUser.data?.memberships.find(
    ({ community, status }) =>
      community.id === data.community.id && status === 'approved',
  )
  const authenticatedRole: DemoRole | null = approvedMembership
    ? approvedMembership.role === 'manager'
      ? 'gerente'
      : approvedMembership.role === 'moderator'
        ? 'moderador'
        : 'jugador'
    : null
  const effectiveRole = authenticatedRole ?? activeRole
  const publishingMember = getPublishingMember(data, effectiveRole)
  const dataSummary = getDemoDataSummary(data)
  const cardRouteParams = new URLSearchParams(routeQuery)
  const rankingRouteParams = new URLSearchParams(routeQuery)
  const eventRouteParams = new URLSearchParams(routeQuery)
  const profileRouteParams = new URLSearchParams(routeQuery)
  const newsRouteParams = new URLSearchParams(routeQuery)
  const requestedSettingsSection = profileRouteParams.get('section')
  const isSettingsView =
    activeRoute === 'perfil' &&
    profileRouteParams.get('view') === 'configuracion' &&
    effectiveRole === 'gerente'
  const sharedCardsMemberId =
    activeRoute === 'cartas' ? cardRouteParams.get('member') : null

  const resetDemo = () => {
    resetRole()
    resetData()
  }

  if (activeRoute === 'registro') {
    const registrationRouteParams = new URLSearchParams(routeQuery)

    return (
      <RegistrationPage
        community={data.community}
        games={data.games}
        invitationToken={registrationRouteParams.get('invite')}
        tags={data.tags}
        onComplete={async () => {
          await currentUser.refresh()
          navigate('inicio')
        }}
      />
    )
  }

  if (activeRoute === 'acceso') {
    return (
      <AccessPage
        community={data.community}
        onComplete={async () => {
          await currentUser.refresh()
          navigate('inicio')
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      <AppHeader activeRole={effectiveRole} community={data.community} />

      <main className="app-content" id="main-content">
        {activeRoute === 'inicio' ? (
          <HomePage
            activeRole={effectiveRole}
            data={data}
            currentMember={currentMember}
            publishingMember={publishingMember}
            onNavigate={navigate}
          />
        ) : activeRoute === 'eventos' ? (
          <EventsPage
            activeRole={effectiveRole}
            data={data}
            currentMember={currentMember}
            publishingMember={publishingMember}
            onDataChange={updateData}
            onNavigate={navigate}
            initialManagerAction={
              eventRouteParams.get('action') === 'new' ? 'new' : undefined
            }
          />
        ) : activeRoute === 'ranking' ? (
          <RankingsPage
            data={data}
            initialStandingId={rankingRouteParams.get('standing') ?? undefined}
            initialView={
              rankingRouteParams.get('view') === 'events' ? 'events' : undefined
            }
          />
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
            activeRole={effectiveRole}
            data={data}
            currentMember={currentMember}
            initialPostId={newsRouteParams.get('post') ?? undefined}
            onManagePublications={() =>
              navigate('perfil', 'view=configuracion&section=communications')
            }
          />
        ) : isSettingsView ? (
          <SettingsPage
            data={data}
            managerId={publishingMember.id}
            initialSection={
              isSettingsSection(requestedSettingsSection)
                ? requestedSettingsSection
                : undefined
            }
            onDataChange={updateData}
            onBack={() => navigate('perfil')}
            onViewNewsPost={(postId) =>
              navigate('noticias', `post=${encodeURIComponent(postId)}`)
            }
          />
        ) : activeRoute === 'perfil' ? (
          <ProfilePage
            activeRole={effectiveRole}
            data={data}
            currentMember={currentMember}
            dataSummary={dataSummary}
            onRoleChange={setActiveRole}
            onDataChange={updateData}
            onReset={resetDemo}
            onOpenSettings={() => navigate('perfil', 'view=configuracion')}
          />
        ) : (
          <PlaceholderPage route={activeRoute} onNavigate={navigate} />
        )}
      </main>

      <AppNavigation activeRoute={activeRoute} onNavigate={navigate} />
    </div>
  )
}
