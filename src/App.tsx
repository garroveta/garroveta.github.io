import { useCallback } from 'react'

import {
  cancelPersistedEventRegistration,
  createCommunityEvent,
  deletePersistedCommunityEvent,
  listPersistedEventRegistrations,
  registerForPersistedEvent,
  removePersistedEventRegistration,
  updatePersistedCommunityEvent,
  type CommunityEventWriteInput,
} from './api/communityEvents'
import { AppHeader } from './components/AppHeader'
import { AppNavigation } from './components/AppNavigation'
import { signOutCurrentUser } from './api/authentication'
import { updateCurrentMembership } from './api/currentUser'
import {
  saveCommunitySettings,
  type PersistedCommunitySettings,
} from './api/communitySettings'
import {
  createCommunityReferential,
  deleteCommunityReferential,
  reorderCommunityReferentials,
  updateCommunityReferential,
} from './api/communityReferentials'
import type { DemoRole } from './app/demoRoles'
import { getDemoDataSummary } from './data/demoData'
import {
  applyCommunityOptionOrder,
  removeCommunityOption,
  replaceCommunityReferentials,
  upsertCommunityOption,
  type CommunityReferentials,
} from './data/communityOptions'
import type { DemoDataSet } from './domain/types'
import { useDemoData } from './hooks/useDemoData'
import { useCommunityEvents } from './hooks/useCommunityEvents'
import { useCommunityCommunications } from './hooks/useCommunityCommunications'
import { useCommunitySettings } from './hooks/useCommunitySettings'
import { useCommunityReferentials } from './hooks/useCommunityReferentials'
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
import { CommunityAccessPage } from './pages/CommunityAccessPage'
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

function getMemberInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean)

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toLocaleUpperCase('es')
}

export function App() {
  const { activeRoute, routeQuery, navigate } = useHashRoute()
  const { activeRole, setActiveRole, resetRole } = useDemoRole()
  const { data, updateData, resetData } = useDemoData()
  const currentUser = useCurrentUser()
  const currentMember = getCurrentMember(data)
  const currentMembership = currentUser.data?.memberships.find(
    ({ community }) => community.id === data.community.id,
  )
  const approvedMembership =
    currentMembership?.status === 'approved' ? currentMembership : undefined
  const replaceCommunityEvents = useCallback(
    (
      events: DemoDataSet['events'],
      registrations: DemoDataSet['registrations'],
    ) => {
      updateData((currentData) => ({
        ...currentData,
        events,
        registrations: registrations.map((registration) => ({
          ...registration,
          memberId: currentData.currentMemberId,
        })),
      }))
    },
    [updateData],
  )
  const communityEvents = useCommunityEvents({
    communityId: data.community.id,
    enabled: Boolean(approvedMembership),
    onLoaded: replaceCommunityEvents,
  })
  const replaceCommunityCommunications = useCallback(
    (communications: DemoDataSet['newsPosts']) => {
      updateData((currentData) => ({
        ...currentData,
        newsPosts: communications,
      }))
    },
    [updateData],
  )
  const communityCommunications = useCommunityCommunications({
    communityId: data.community.id,
    enabled: Boolean(approvedMembership),
    onLoaded: replaceCommunityCommunications,
  })
  const replaceCommunitySettings = useCallback(
    (community: PersistedCommunitySettings) => {
      updateData((currentData) => ({
        ...currentData,
        community: {
          ...currentData.community,
          ...community,
        },
      }))
    },
    [updateData],
  )
  const communitySettings = useCommunitySettings({
    communityId: data.community.id,
    enabled: Boolean(approvedMembership),
    onLoaded: replaceCommunitySettings,
  })
  const replaceReferentials = useCallback(
    (referentials: CommunityReferentials) => {
      updateData((currentData) =>
        replaceCommunityReferentials(currentData, referentials),
      )
    },
    [updateData],
  )
  const communityReferentials = useCommunityReferentials({
    communityId: data.community.id,
    enabled: Boolean(approvedMembership),
    onLoaded: replaceReferentials,
  })
  const listEventParticipants = useCallback(
    (eventId: string) =>
      listPersistedEventRegistrations(data.community.id, eventId),
    [data.community.id],
  )
  const agendaData =
    approvedMembership && communityEvents.status !== 'ready'
      ? { ...data, events: [] }
      : data
  const communicationData =
    approvedMembership && communityCommunications.status !== 'ready'
      ? { ...data, newsPosts: [] }
      : data
  const authenticatedRole: DemoRole | null = approvedMembership
    ? approvedMembership.role === 'manager'
      ? 'gerente'
      : approvedMembership.role === 'moderator'
        ? 'moderador'
        : 'jugador'
    : null
  const effectiveRole = authenticatedRole ?? activeRole
  const connectedMember = approvedMembership
    ? {
        ...currentMember,
        displayName: approvedMembership.displayName,
        favoriteGameIds: approvedMembership.favoriteGameIds,
        initials: getMemberInitials(approvedMembership.displayName),
        joinedAt: approvedMembership.joinedAt,
        role: approvedMembership.role,
        status: approvedMembership.status,
        tagIds: approvedMembership.tagIds,
      }
    : currentMember
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

  const refreshAccess = async () => {
    const refreshedUser = await currentUser.refresh()

    return refreshedUser?.memberships.find(
      ({ community }) => community.id === data.community.id,
    )
  }

  if (currentUser.status === 'loading') {
    return <CommunityAccessPage community={data.community} state="loading" />
  }

  if (currentUser.status === 'error') {
    return (
      <CommunityAccessPage
        community={data.community}
        error={currentUser.error}
        state="error"
        onAction={() => void currentUser.refresh()}
      />
    )
  }

  if (currentUser.status === 'unauthenticated') {
    return (
      <AccessPage
        community={data.community}
        onComplete={async () => {
          const membership = await refreshAccess()

          if (activeRoute === 'acceso' && membership?.status === 'approved') {
            navigate('inicio')
          }
        }}
      />
    )
  }

  const authenticatedUserData = currentUser.data

  if (!authenticatedUserData) {
    return (
      <CommunityAccessPage
        community={data.community}
        state="error"
        onAction={() => void currentUser.refresh()}
      />
    )
  }

  if (!currentMembership) {
    return (
      <CommunityAccessPage
        community={data.community}
        email={authenticatedUserData.user.email}
        state="missing"
      />
    )
  }

  if (currentMembership.status === 'pending') {
    return (
      <CommunityAccessPage
        community={data.community}
        email={authenticatedUserData.user.email}
        state="pending"
      />
    )
  }

  if (currentMembership.status === 'suspended') {
    return (
      <CommunityAccessPage
        community={data.community}
        email={authenticatedUserData.user.email}
        state="suspended"
      />
    )
  }

  if (activeRoute === 'acceso') {
    return (
      <CommunityAccessPage
        community={data.community}
        email={currentUser.data?.user.email}
        state="authenticated"
        onAction={() => navigate('inicio')}
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
            data={{
              ...agendaData,
              newsPosts: communicationData.newsPosts,
            }}
            currentMember={connectedMember}
            publishingMember={publishingMember}
            onNavigate={navigate}
          />
        ) : activeRoute === 'eventos' ? (
          <EventsPage
            activeRole={effectiveRole}
            data={agendaData}
            currentMember={connectedMember}
            publishingMember={publishingMember}
            eventPersistenceStatus={communityEvents.status}
            eventPersistenceError={communityEvents.error}
            onDataChange={updateData}
            onCreateEvent={async (input) => {
              const { event } = await createCommunityEvent(
                data.community.id,
                input,
              )
              updateData((currentData) => ({
                ...currentData,
                events: [...currentData.events, event],
              }))
            }}
            onDeleteEvent={async (eventId) => {
              await deletePersistedCommunityEvent(data.community.id, eventId)
              updateData((currentData) => ({
                ...currentData,
                events: currentData.events.filter(({ id }) => id !== eventId),
                registrations: currentData.registrations.filter(
                  ({ eventId: registrationEventId }) =>
                    registrationEventId !== eventId,
                ),
                eventStandings: currentData.eventStandings.filter(
                  ({ eventId: standingEventId }) => standingEventId !== eventId,
                ),
              }))
            }}
            onNavigate={navigate}
            onReloadEvents={communityEvents.reload}
            onCancelRegistration={async (eventId) => {
              const result = await cancelPersistedEventRegistration(
                data.community.id,
                eventId,
              )
              updateData((currentData) => ({
                ...currentData,
                events: currentData.events.map((event) =>
                  event.id === eventId
                    ? {
                        ...event,
                        registrationSummary: result.registrationSummary,
                      }
                    : event,
                ),
                registrations: currentData.registrations.filter(
                  (registration) =>
                    registration.eventId !== eventId ||
                    registration.memberId !== currentData.currentMemberId,
                ),
              }))
            }}
            onListParticipants={listEventParticipants}
            onRegister={async (eventId) => {
              const result = await registerForPersistedEvent(
                data.community.id,
                eventId,
              )
              const visibleRegistration = {
                ...result.registration,
                memberId: data.currentMemberId,
              }
              updateData((currentData) => ({
                ...currentData,
                events: currentData.events.map((event) =>
                  event.id === eventId
                    ? {
                        ...event,
                        registrationSummary: result.registrationSummary,
                      }
                    : event,
                ),
                registrations: [
                  ...currentData.registrations.filter(
                    (registration) =>
                      registration.eventId !== eventId ||
                      registration.memberId !== currentData.currentMemberId,
                  ),
                  visibleRegistration,
                ],
              }))

              return visibleRegistration
            }}
            onRemoveParticipant={async (eventId, memberId) => {
              const result = await removePersistedEventRegistration(
                data.community.id,
                eventId,
                memberId,
              )
              updateData((currentData) => ({
                ...currentData,
                events: currentData.events.map((event) =>
                  event.id === eventId
                    ? {
                        ...event,
                        registrationSummary: result.registrationSummary,
                      }
                    : event,
                ),
              }))
            }}
            onUpdateEvent={async (eventId, input: CommunityEventWriteInput) => {
              const { event } = await updatePersistedCommunityEvent(
                data.community.id,
                eventId,
                input,
              )
              updateData((currentData) => ({
                ...currentData,
                events: currentData.events.map((candidate) =>
                  candidate.id === event.id ? event : candidate,
                ),
              }))
            }}
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
            currentMember={connectedMember}
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
            currentMember={connectedMember}
            initialView={
              cardRouteParams.get('view') === 'market' ? 'market' : undefined
            }
            onDataChange={updateData}
          />
        ) : activeRoute === 'noticias' ? (
          <NewsPage
            activeRole={effectiveRole}
            data={communicationData}
            currentMember={connectedMember}
            communicationPersistenceStatus={communityCommunications.status}
            communicationPersistenceError={communityCommunications.error}
            initialPostId={newsRouteParams.get('post') ?? undefined}
            onManagePublications={() =>
              navigate('perfil', 'view=configuracion&section=communications')
            }
            onReloadCommunications={communityCommunications.reload}
          />
        ) : isSettingsView ? (
          <SettingsPage
            data={communicationData}
            communicationPersistenceStatus={communityCommunications.status}
            communicationPersistenceError={communityCommunications.error}
            communitySettingsError={communitySettings.error}
            communitySettingsStatus={communitySettings.status}
            communityReferentialsError={communityReferentials.error}
            communityReferentialsStatus={communityReferentials.status}
            managerId={publishingMember.id}
            initialSection={
              isSettingsSection(requestedSettingsSection)
                ? requestedSettingsSection
                : undefined
            }
            onDataChange={updateData}
            onBack={() => navigate('perfil')}
            onReloadCommunications={communityCommunications.reload}
            onReloadCommunitySettings={communitySettings.reload}
            onReloadCommunityReferentials={communityReferentials.reload}
            onCreateCommunityOption={async (input) => {
              const { option } = await createCommunityReferential(
                data.community.id,
                input,
              )
              updateData((currentData) =>
                upsertCommunityOption(currentData, input.section, option),
              )
            }}
            onDeleteCommunityOption={async (section, optionId) => {
              await deleteCommunityReferential(
                data.community.id,
                section,
                optionId,
              )
              updateData((currentData) =>
                removeCommunityOption(currentData, section, optionId),
              )
            }}
            onReorderCommunityOptions={async (section, optionIds) => {
              const result = await reorderCommunityReferentials(
                data.community.id,
                section,
                optionIds,
              )
              updateData((currentData) =>
                applyCommunityOptionOrder(
                  currentData,
                  section,
                  result.optionIds,
                ),
              )
            }}
            onSaveCommunitySettings={async (input) => {
              const { community } = await saveCommunitySettings(
                data.community.id,
                input,
              )
              replaceCommunitySettings(community)
            }}
            onUpdateCommunityOption={async (optionId, input, isActive) => {
              const { option } = await updateCommunityReferential(
                data.community.id,
                optionId,
                input,
                isActive,
              )
              updateData((currentData) =>
                upsertCommunityOption(currentData, input.section, option),
              )
            }}
            onViewNewsPost={(postId) =>
              navigate('noticias', `post=${encodeURIComponent(postId)}`)
            }
          />
        ) : activeRoute === 'perfil' ? (
          <ProfilePage
            activeRole={effectiveRole}
            accountEmail={authenticatedUserData.user.email}
            data={data}
            currentMember={connectedMember}
            dataSummary={dataSummary}
            onRoleChange={setActiveRole}
            onReset={resetDemo}
            onOpenSettings={() => navigate('perfil', 'view=configuracion')}
            onSignOut={async () => {
              await signOutCurrentUser()
              await currentUser.refresh()
              navigate('acceso')
            }}
            onSaveAccount={async (input) => {
              await updateCurrentMembership({
                communityId: data.community.id,
                ...input,
              })
              await currentUser.refresh()
            }}
          />
        ) : (
          <PlaceholderPage route={activeRoute} onNavigate={navigate} />
        )}
      </main>

      <AppNavigation activeRoute={activeRoute} onNavigate={navigate} />
    </div>
  )
}
