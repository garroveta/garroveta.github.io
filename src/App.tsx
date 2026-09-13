import { useCallback, useState } from 'react'

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
import { saveCommunityBadgeSettings } from './api/communityBadgeSettings'
import { saveCommunityRegistrationSettings } from './api/communityRegistrationSettings'
import {
  createCommunityReferential,
  deleteCommunityReferential,
  reorderCommunityReferentials,
  updateCommunityReferential,
} from './api/communityReferentials'
import {
  activateCommunityRankingSeason,
  closeCommunityRankingSeason,
  createCommunityRankingSeason,
  deleteCommunityRankingSeason,
  updateCommunityRankingSeason,
} from './api/rankingSeasons'
import { saveCommunityEventStanding } from './api/eventStandings'
import type { DemoRole } from './app/demoRoles'
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
import { useCommunityBadgeSettings } from './hooks/useCommunityBadgeSettings'
import { useCommunityRegistrationSettings } from './hooks/useCommunityRegistrationSettings'
import { useRankingSeasons } from './hooks/useRankingSeasons'
import { useEventStandings } from './hooks/useEventStandings'
import { useCommunityMembers } from './hooks/useCommunityMembers'
import { getMemberInitials } from './data/communityMembers'
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
import { MemberProfilePage } from './pages/MemberProfilePage'
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

type DataFeed = {
  error: unknown
  reload: () => void
  status: 'error' | 'idle' | 'loading' | 'ready'
}

function getCombinedDataState(feeds: DataFeed[]) {
  const failedFeed = feeds.find(({ status }) => status === 'error')

  return {
    error: failedFeed?.error,
    status: failedFeed
      ? ('error' as const)
      : feeds.every(({ status }) => status === 'ready')
        ? ('ready' as const)
        : ('loading' as const),
  }
}

function reloadFailedFeeds(feeds: DataFeed[]) {
  feeds
    .filter(({ status }) => status === 'error')
    .forEach(({ reload }) => reload())
}

export function App() {
  const { activeRoute, routeQuery, navigate } = useHashRoute()
  const { data, updateData } = useDemoData()
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
  const replaceRegistrationSettings = useCallback(
    (registrationSettings: DemoDataSet['registrationSettings']) => {
      updateData((currentData) => ({
        ...currentData,
        registrationSettings,
      }))
    },
    [updateData],
  )
  const communityRegistrationSettings = useCommunityRegistrationSettings({
    communityId: data.community.id,
    enabled: Boolean(approvedMembership),
    onLoaded: replaceRegistrationSettings,
  })
  const replaceBadgeSettings = useCallback(
    (badgeSettings: DemoDataSet['badgeSettings']) => {
      updateData((currentData) => ({ ...currentData, badgeSettings }))
    },
    [updateData],
  )
  const communityBadgeSettings = useCommunityBadgeSettings({
    communityId: data.community.id,
    enabled: Boolean(approvedMembership),
    onLoaded: replaceBadgeSettings,
  })
  const replaceRankingSeasons = useCallback(
    (rankingSeasons: DemoDataSet['rankingSeasons']) => {
      updateData((currentData) => ({ ...currentData, rankingSeasons }))
    },
    [updateData],
  )
  const rankingSeasons = useRankingSeasons({
    communityId: data.community.id,
    enabled: Boolean(approvedMembership),
    onLoaded: replaceRankingSeasons,
  })
  const replaceEventStandings = useCallback(
    (eventStandings: DemoDataSet['eventStandings']) => {
      updateData((currentData) => ({ ...currentData, eventStandings }))
    },
    [updateData],
  )
  const eventStandings = useEventStandings({
    communityId: data.community.id,
    enabled: Boolean(approvedMembership),
    onLoaded: replaceEventStandings,
  })
  const [communityMembers, setCommunityMembers] = useState<
    DemoDataSet['members']
  >(data.members)
  const communityMembersFeed = useCommunityMembers({
    communityId: data.community.id,
    enabled: Boolean(approvedMembership),
    onLoaded: setCommunityMembers,
  })
  // A stored `moderator` role grants nothing, so it is presented as a player
  // rather than shown as a capability the application does not provide.
  const authenticatedRole: DemoRole | null = approvedMembership
    ? approvedMembership.role === 'manager'
      ? 'gerente'
      : 'jugador'
    : null
  const effectiveRole = authenticatedRole ?? 'jugador'
  const rankingFeeds = [
    rankingSeasons,
    eventStandings,
    communityMembersFeed,
    communityBadgeSettings,
  ] satisfies DataFeed[]
  const homeFeeds = (
    effectiveRole === 'gerente'
      ? [communityEvents]
      : [communityEvents, communityCommunications, ...rankingFeeds]
  ) satisfies DataFeed[]
  const homeDataState = getCombinedDataState(homeFeeds)
  const rankingDataState = getCombinedDataState(rankingFeeds)
  const listEventParticipants = useCallback(
    (eventId: string) =>
      listPersistedEventRegistrations(data.community.id, eventId),
    [data.community.id],
  )
  const agendaData =
    approvedMembership &&
    (communityEvents.status !== 'ready' || eventStandings.status !== 'ready')
      ? {
          ...data,
          events: communityEvents.status === 'ready' ? data.events : [],
          eventStandings:
            eventStandings.status === 'ready' ? data.eventStandings : [],
        }
      : data
  const communicationData =
    approvedMembership && communityCommunications.status !== 'ready'
      ? { ...data, newsPosts: [] }
      : data
  const rankingData =
    approvedMembership &&
    (rankingSeasons.status !== 'ready' ||
      eventStandings.status !== 'ready' ||
      communityMembersFeed.status !== 'ready')
      ? {
          ...data,
          rankingSeasons:
            rankingSeasons.status === 'ready' ? data.rankingSeasons : [],
          eventStandings:
            eventStandings.status === 'ready' ? data.eventStandings : [],
          members:
            communityMembersFeed.status === 'ready' ? communityMembers : [],
        }
      : approvedMembership
        ? { ...data, members: communityMembers }
        : data
  const homeData = {
    ...rankingData,
    events: agendaData.events,
    newsPosts: communicationData.newsPosts,
  }
  const connectedMember = approvedMembership
    ? {
        ...currentMember,
        contactMethods: approvedMembership.contactMethods,
        displayName: approvedMembership.displayName,
        favoriteGameIds: approvedMembership.favoriteGameIds,
        initials: getMemberInitials(approvedMembership.displayName),
        joinedAt: approvedMembership.joinedAt,
        role: approvedMembership.role,
        status: approvedMembership.status,
        tagIds: approvedMembership.tagIds,
      }
    : currentMember
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
  const profileMember =
    activeRoute === 'miembro'
      ? rankingData.members.find(
          ({ id }) => id === new URLSearchParams(routeQuery).get('id'),
        )
      : undefined

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
            data={homeData}
            cardsData={data}
            currentMember={connectedMember}
            dataError={homeDataState.error}
            dataStatus={homeDataState.status}
            rankingMemberId={approvedMembership?.id}
            onNavigate={navigate}
            onRetryData={() => reloadFailedFeeds(homeFeeds)}
          />
        ) : activeRoute === 'eventos' ? (
          <EventsPage
            activeRole={effectiveRole}
            data={agendaData}
            currentMember={connectedMember}
            eventPersistenceStatus={communityEvents.status}
            eventPersistenceError={communityEvents.error}
            onCreateEvent={async (input) => {
              const { event } = await createCommunityEvent(
                data.community.id,
                input,
              )
              updateData((currentData) => ({
                ...currentData,
                events: [...currentData.events, event],
              }))
              return event
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

              return result
            }}
            onSaveEventStanding={async (eventId, input) => {
              const { standing } = await saveCommunityEventStanding(
                data.community.id,
                eventId,
                input,
              )
              updateData((currentData) => ({
                ...currentData,
                events: currentData.events.map((event) =>
                  event.id === eventId
                    ? {
                        ...event,
                        countsForCommunityRanking:
                          input.countsForCommunityRanking,
                        status: 'completed' as const,
                      }
                    : event,
                ),
                eventStandings: currentData.eventStandings.some(
                  ({ eventId: standingEventId }) => standingEventId === eventId,
                )
                  ? currentData.eventStandings.map((candidate) =>
                      candidate.eventId === eventId ? standing : candidate,
                    )
                  : [...currentData.eventStandings, standing],
              }))

              return standing
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
              return event
            }}
            initialEventId={eventRouteParams.get('event') ?? undefined}
            initialManagerAction={
              eventRouteParams.get('action') === 'new' ? 'new' : undefined
            }
          />
        ) : activeRoute === 'ranking' ? (
          <RankingsPage
            data={rankingData}
            dataError={rankingDataState.error}
            dataStatus={rankingDataState.status}
            initialCommunityFilters={{
              competitionEventKindId:
                rankingRouteParams.get('series') ?? undefined,
              formatId: rankingRouteParams.get('format') ?? undefined,
              gameId: rankingRouteParams.get('game') ?? undefined,
              seasonId: rankingRouteParams.get('season') ?? undefined,
            }}
            initialStandingId={rankingRouteParams.get('standing') ?? undefined}
            initialView={
              rankingRouteParams.get('view') === 'events' ? 'events' : undefined
            }
            rankingMemberId={approvedMembership?.id}
            onOpenMember={(memberId) => navigate('miembro', `id=${memberId}`)}
            onRetryData={() => reloadFailedFeeds(rankingFeeds)}
          />
        ) : activeRoute === 'miembro' ? (
          profileMember ? (
            <MemberProfilePage
              data={rankingData}
              member={profileMember}
              onBack={() => navigate('ranking')}
            />
          ) : (
            <div className="page">
              <header className="page-heading">
                <h1>Miembro no encontrado</h1>
                <p>
                  Puede que haya dejado la comunidad o que el enlace ya no sea
                  válido.
                </p>
              </header>
            </div>
          )
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
            registrationSettingsError={communityRegistrationSettings.error}
            registrationSettingsStatus={communityRegistrationSettings.status}
            rankingSeasonsError={rankingSeasons.error}
            rankingSeasonsStatus={rankingSeasons.status}
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
            onReloadRegistrationSettings={communityRegistrationSettings.reload}
            onReloadRankingSeasons={rankingSeasons.reload}
            onActivateRankingSeason={async (seasonId) => {
              const { season } = await activateCommunityRankingSeason(
                data.community.id,
                seasonId,
              )
              updateData((currentData) => ({
                ...currentData,
                rankingSeasons: currentData.rankingSeasons.map((candidate) =>
                  candidate.id === season.id ? season : candidate,
                ),
              }))
            }}
            onCloseRankingSeason={async (seasonId) => {
              const { season } = await closeCommunityRankingSeason(
                data.community.id,
                seasonId,
              )
              updateData((currentData) => ({
                ...currentData,
                rankingSeasons: currentData.rankingSeasons.map((candidate) =>
                  candidate.id === season.id ? season : candidate,
                ),
              }))
            }}
            onCreateRankingSeason={async (input) => {
              const { season } = await createCommunityRankingSeason(
                data.community.id,
                input,
              )
              updateData((currentData) => ({
                ...currentData,
                rankingSeasons: [...currentData.rankingSeasons, season],
              }))
            }}
            onDeleteRankingSeason={async (seasonId) => {
              await deleteCommunityRankingSeason(data.community.id, seasonId)
              updateData((currentData) => ({
                ...currentData,
                rankingSeasons: currentData.rankingSeasons.filter(
                  ({ id }) => id !== seasonId,
                ),
              }))
            }}
            onUpdateRankingSeason={async (seasonId, input) => {
              const { season } = await updateCommunityRankingSeason(
                data.community.id,
                seasonId,
                input,
              )
              updateData((currentData) => ({
                ...currentData,
                rankingSeasons: currentData.rankingSeasons.map((candidate) =>
                  candidate.id === season.id ? season : candidate,
                ),
              }))
            }}
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
            onSaveBadgeSettings={
              approvedMembership
                ? async (input) => {
                    const { badgeSettings } = await saveCommunityBadgeSettings(
                      data.community.id,
                      input,
                    )
                    replaceBadgeSettings(badgeSettings)
                  }
                : undefined
            }
            onSaveRegistrationSettings={async (input) => {
              const { registrationSettings } =
                await saveCommunityRegistrationSettings(
                  data.community.id,
                  input,
                )
              replaceRegistrationSettings(registrationSettings)
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
