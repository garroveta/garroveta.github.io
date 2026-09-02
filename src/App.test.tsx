import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { reserveMarketplaceListing } from './data/cardLifecycle'
import { demoData } from './data/demoData'
import { createLocalDemoRepository } from './data/demoRepository'
import { ClientApiError } from './api/client'
import type {
  CommunityCommunication,
  CommunityCommunicationWriteInput,
} from './api/communityCommunications'
import type { CommunityCommunicationsStatus } from './hooks/useCommunityCommunications'
import type { CommunityEventWriteInput } from './api/communityEvents'
import type { CurrentUser } from './api/currentUser'
import type { ManagedCommunityMember } from './api/managerMembers'
import type { CommunityEventsStatus } from './hooks/useCommunityEvents'

const registrationApiMocks = vi.hoisted(() => ({
  redeemInvitation: vi.fn(),
  sendSignInOtp: vi.fn(),
  validateInvitation: vi.fn(),
  verifySignInOtp: vi.fn(),
}))
const managerInvitationApiMocks = vi.hoisted(() => ({
  createCommunityInvitation: vi.fn(),
  listCommunityInvitations: vi.fn(),
}))
const managerMemberApiMocks = vi.hoisted(() => ({
  listCommunityMembers: vi.fn(),
  updateCommunityMember: vi.fn(),
}))
const currentUserHookMocks = vi.hoisted(() => ({
  current: null as unknown,
  refresh: vi.fn(),
}))
const currentUserApiMocks = vi.hoisted(() => ({
  updateCurrentMembership: vi.fn(),
}))
const authenticationApiMocks = vi.hoisted(() => ({
  signOutCurrentUser: vi.fn(),
}))
const communityEventApiMocks = vi.hoisted(() => ({
  cancelPersistedEventRegistration: vi.fn(),
  createCommunityEvent: vi.fn(),
  deletePersistedCommunityEvent: vi.fn(),
  listPersistedEventRegistrations: vi.fn(),
  registerForPersistedEvent: vi.fn(),
  removePersistedEventRegistration: vi.fn(),
  updatePersistedCommunityEvent: vi.fn(),
}))
const communityCommunicationApiMocks = vi.hoisted(() => ({
  createCommunityCommunication: vi.fn(),
  deleteCommunityCommunication: vi.fn(),
  updateCommunityCommunication: vi.fn(),
}))
const communityEventsHookMocks = vi.hoisted(() => ({
  reload: vi.fn(),
  status: 'ready' as CommunityEventsStatus,
}))
const communityCommunicationsHookMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  reload: vi.fn(),
  status: 'ready' as CommunityCommunicationsStatus,
}))

vi.mock('./api/registration', () => registrationApiMocks)
vi.mock('./api/managerInvitations', () => managerInvitationApiMocks)
vi.mock('./api/managerMembers', () => managerMemberApiMocks)
vi.mock('./api/currentUser', () => currentUserApiMocks)
vi.mock('./api/authentication', () => authenticationApiMocks)
vi.mock('./api/communityEvents', () => communityEventApiMocks)
vi.mock('./api/communityCommunications', () => communityCommunicationApiMocks)
vi.mock('./hooks/useCommunityEvents', () => ({
  useCommunityEvents: () => communityEventsHookMocks,
}))
vi.mock('./hooks/useCommunityCommunications', () => ({
  useCommunityCommunications: (options: unknown) => {
    communityCommunicationsHookMocks.invoke(options)
    return communityCommunicationsHookMocks
  },
}))
vi.mock('./hooks/useCurrentUser', async () => {
  const { useState } = await vi.importActual<typeof import('react')>('react')

  return {
    useCurrentUser: () => {
      const [state, setState] = useState(currentUserHookMocks.current)

      return {
        ...(state as object),
        refresh: async () => {
          const user = await currentUserHookMocks.refresh()
          setState(
            user
              ? { data: user, status: 'authenticated' }
              : { data: null, status: 'unauthenticated' },
          )
          return user
        },
      }
    },
  }
})

const validInvitationToken = 'a'.repeat(43)

function buildCurrentUser(
  role: 'manager' | 'moderator' | 'player' = 'player',
  status: 'approved' | 'pending' | 'suspended' = 'approved',
): CurrentUser {
  const identity =
    role === 'manager'
      ? { displayName: 'Tomás', id: 'tomas' }
      : role === 'moderator'
        ? { displayName: 'Diego Sánchez', id: 'diego' }
        : { displayName: 'Álex Romero', id: 'alex' }

  return {
    memberships: [
      {
        community: {
          city: 'Inca',
          id: 'community-crc-delorean',
          name: 'CRC Delorean',
          slug: 'crc-delorean',
        },
        displayName: identity.displayName,
        favoriteGameIds: ['game-mtg', 'game-one-piece'],
        id: `member-${identity.id}`,
        joinedAt: '2026-01-01T10:00:00.000Z',
        role,
        status,
        tagIds: ['tag-commander', 'tag-intercambios'],
      },
    ],
    user: {
      email: `${identity.id}@example.com`,
      id: `user-${identity.id}`,
      name: identity.displayName,
    },
  }
}

function authenticateAsManager() {
  const user = buildCurrentUser('manager')
  currentUserHookMocks.current = { data: user, status: 'authenticated' }
  currentUserHookMocks.refresh.mockResolvedValue(user)
}

const importedEventLinkHtml = `
  <!-- saved from url=(0077)https://eventlink.wizards.com/stores/18452/events/11620006/rounds/3/standings -->
  <h1 class="event-page-header__title">Presentación: The Hobbit</h1>
  <div class="round-timer__complete">Se completó</div>
  <table>
    <thead><tr><th>Puesto</th><th>Nombre</th><th>Puntos</th><th>V/D/E</th><th>%VPO</th><th>%JG</th><th>%JGO</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Pep Peralta Isern</td><td>9</td><td>3/0/0</td><td>60.0%</td><td>100.0%</td><td>55.0%</td></tr>
      <tr><td>2</td><td>José Thomas 🔴⚪</td><td>6</td><td>2/1/0</td><td>55.0%</td><td>66.7%</td><td>50.0%</td></tr>
    </tbody>
  </table>
`

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.clearAllMocks()
    communityEventsHookMocks.status = 'ready'
    communityCommunicationsHookMocks.status = 'ready'
    const currentUser = buildCurrentUser()
    currentUserHookMocks.current = {
      data: currentUser,
      status: 'authenticated',
    }
    currentUserHookMocks.refresh.mockResolvedValue(currentUser)
    currentUserApiMocks.updateCurrentMembership.mockResolvedValue({
      membership: currentUser.memberships[0],
    })
    authenticationApiMocks.signOutCurrentUser.mockResolvedValue(undefined)
    communityCommunicationApiMocks.createCommunityCommunication.mockImplementation(
      (_communityId: string, input: CommunityCommunicationWriteInput) =>
        Promise.resolve({
          communication: {
            ...input,
            authorDisplayName: 'Tomás',
            authorMemberId: 'member-tomas',
            communityId: 'community-crc-delorean',
            id: `communication-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            publishedAt: '2026-09-02T10:00:00.000Z',
          },
        }),
    )
    communityCommunicationApiMocks.updateCommunityCommunication.mockImplementation(
      (
        _communityId: string,
        communicationId: string,
        input: CommunityCommunicationWriteInput,
      ) =>
        Promise.resolve({
          communication: {
            ...input,
            authorDisplayName: 'Tomás',
            authorMemberId: 'member-tomas',
            communityId: 'community-crc-delorean',
            id: communicationId,
            publishedAt: '2026-09-02T10:00:00.000Z',
          },
        }),
    )
    communityCommunicationApiMocks.deleteCommunityCommunication.mockImplementation(
      (_communityId: string, communicationId: string) =>
        Promise.resolve({ deletedCommunicationId: communicationId }),
    )
    communityEventApiMocks.createCommunityEvent.mockImplementation(
      (_communityId: string, input: CommunityEventWriteInput) =>
        Promise.resolve({
          event: {
            ...input,
            capacity: input.registrationEnabled ? input.capacity : 0,
            communityId: 'community-crc-delorean',
            createdByMemberId: 'member-tomas',
            id: `event-persisted-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            registrationSummary: { confirmed: 0, waitlisted: 0 },
            status: 'scheduled',
          },
        }),
    )
    communityEventApiMocks.updatePersistedCommunityEvent.mockImplementation(
      (
        _communityId: string,
        eventId: string,
        input: CommunityEventWriteInput,
      ) =>
        Promise.resolve({
          event: {
            ...input,
            communityId: 'community-crc-delorean',
            createdByMemberId: 'member-tomas',
            id: eventId,
            registrationSummary: { confirmed: 0, waitlisted: 0 },
            status: 'scheduled',
          },
        }),
    )
    communityEventApiMocks.deletePersistedCommunityEvent.mockImplementation(
      (_communityId: string, eventId: string) =>
        Promise.resolve({ deletedEventId: eventId }),
    )
    communityEventApiMocks.registerForPersistedEvent.mockImplementation(
      (_communityId: string, eventId: string) =>
        Promise.resolve({
          registration: {
            eventId,
            id: `registration-${eventId}`,
            memberId: 'member-alex',
            registeredAt: '2026-09-01T10:00:00.000Z',
            status:
              eventId === 'event-presentation-hobbit'
                ? ('waitlisted' as const)
                : ('confirmed' as const),
          },
          registrationSummary:
            eventId === 'event-presentation-hobbit'
              ? { confirmed: 30, waitlisted: 3 }
              : { confirmed: 7, waitlisted: 0 },
        }),
    )
    communityEventApiMocks.cancelPersistedEventRegistration.mockImplementation(
      (_communityId: string, eventId: string) =>
        Promise.resolve({
          cancelledMemberId: 'member-alex',
          registrationSummary:
            eventId === 'event-presentation-hobbit'
              ? { confirmed: 30, waitlisted: 2 }
              : { confirmed: 6, waitlisted: 0 },
        }),
    )
    communityEventApiMocks.listPersistedEventRegistrations.mockResolvedValue({
      registrations: [
        {
          displayName: 'Sergio Gil',
          eventId: 'event-mtg-draft-express',
          id: 'registration-sergio-draft-express',
          initials: 'SG',
          memberId: 'member-sergio',
          registeredAt: '2026-07-24T21:15:00+02:00',
          status: 'confirmed',
        },
      ],
    })
    communityEventApiMocks.removePersistedEventRegistration.mockResolvedValue({
      cancelledMemberId: 'member-sergio',
      registrationSummary: { confirmed: 3, waitlisted: 0 },
    })
    registrationApiMocks.validateInvitation.mockResolvedValue({
      community: { city: 'Inca', name: 'CRC Delorean' },
      expiresAt: '2026-09-27T12:00:00.000Z',
      status: 'active',
    })
    registrationApiMocks.sendSignInOtp.mockResolvedValue(undefined)
    registrationApiMocks.verifySignInOtp.mockImplementation(
      (_email: string, otp: string) => {
        if (otp !== '246810') {
          return Promise.reject(
            new ClientApiError(400, 'INVALID_OTP', 'Invalid OTP'),
          )
        }

        return Promise.resolve({ user: { id: 'user-invited' } })
      },
    )
    registrationApiMocks.redeemInvitation.mockResolvedValue({
      membership: {
        communityId: 'community-crc-delorean',
        displayName: 'Pep Peralta Isern',
        id: 'member-invited',
        role: 'player',
        status: 'approved',
      },
      status: 'success',
    })
    managerInvitationApiMocks.listCommunityInvitations.mockResolvedValue({
      invitations: [
        {
          communityId: 'community-crc-delorean',
          createdAt: '2026-08-20T17:00:00.000Z',
          createdByMemberId: 'member-tomas',
          expiresAt: '2026-09-20T17:00:00.000Z',
          id: 'invitation-pilot',
          label: 'Grupo piloto de septiembre',
          revokedAt: null,
          status: 'active',
          usedAt: null,
        },
      ],
    })
    managerInvitationApiMocks.createCommunityInvitation.mockResolvedValue({
      invitation: {
        communityId: 'community-crc-delorean',
        createdAt: '2026-08-29T17:00:00.000Z',
        createdByMemberId: 'member-tomas',
        expiresAt: '2026-09-28T17:00:00.000Z',
        id: 'invitation-new',
        inviteUrl: `https://www.garroveta.es/#registro?invite=${validInvitationToken}`,
        label: 'Grupo piloto',
        revokedAt: null,
        status: 'active',
        usedAt: null,
      },
    })
    let managedMembers: ManagedCommunityMember[] = [
      {
        displayName: 'Lucas Muntaner',
        email: 'lucas@example.com',
        favoriteGameIds: ['game-mtg'],
        id: 'member-lucas',
        joinedAt: '2026-08-31T18:00:00.000Z',
        role: 'player',
        status: 'pending',
        tagIds: ['tag-pauper'],
      },
      {
        displayName: 'Tomás',
        email: 'tomas@example.com',
        favoriteGameIds: ['game-mtg'],
        id: 'member-tomas',
        joinedAt: '2026-01-01T10:00:00.000Z',
        role: 'manager',
        status: 'approved',
        tagIds: ['tag-commander'],
      },
      {
        displayName: 'Marta Soler',
        email: 'marta@example.com',
        favoriteGameIds: ['game-mtg'],
        id: 'member-marta',
        joinedAt: '2026-02-01T10:00:00.000Z',
        role: 'player',
        status: 'approved',
        tagIds: ['tag-draft'],
      },
    ]
    managerMemberApiMocks.listCommunityMembers.mockImplementation(() =>
      Promise.resolve({
        currentMemberId: 'member-tomas',
        members: managedMembers,
      }),
    )
    managerMemberApiMocks.updateCommunityMember.mockImplementation(
      (
        _communityId: string,
        memberId: string,
        input: Partial<ManagedCommunityMember>,
      ) => {
        const currentMember = managedMembers.find(({ id }) => id === memberId)

        if (!currentMember) {
          return Promise.reject(new Error('Unknown member'))
        }

        const updatedMember = { ...currentMember, ...input }
        managedMembers = managedMembers.map((member) =>
          member.id === memberId ? updatedMember : member,
        )

        return Promise.resolve({ member: updatedMember })
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('presents the mobile application navigation', () => {
    render(<App />)

    expect(
      screen.getByRole('link', { name: 'Garroveta, inicio' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Hola, Álex' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Torneo Modern' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Nuevo horario de verano' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '4 coincidencias nuevas' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Eventos/ })).not.toHaveLength(0)
    expect(screen.getAllByRole('link', { name: /Cartas/ })).not.toHaveLength(0)
    expect(screen.getAllByRole('link', { name: /Noticias/ })).not.toHaveLength(
      0,
    )
    expect(screen.getByRole('link', { name: /Perfil/ })).toBeInTheDocument()
  })

  it('does not expose demo events while the persisted agenda is loading', () => {
    communityEventsHookMocks.status = 'loading'
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)

    expect(
      screen.getByRole('heading', { name: 'Cargando la agenda…' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Presentación: The Hobbit' }),
    ).not.toBeInTheDocument()
  })

  it('lets a member retry the persisted agenda after a loading error', () => {
    communityEventsHookMocks.status = 'error'
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(communityEventsHookMocks.reload).toHaveBeenCalledOnce()
  })

  it('uses an approved authenticated membership role', async () => {
    authenticateAsManager()

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Hola, Tomás' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Gerente')).toBeInTheDocument()
  })

  it('opens a section from the main navigation', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)

    expect(screen.getByRole('heading', { name: 'Eventos' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Próximos eventos' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'FNM Standard' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('opens the latest community event standings', () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }))

    expect(
      screen.getByRole('heading', { name: 'Clasificaciones' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Últimos eventos' }))

    expect(
      screen.getByRole('heading', { name: 'Win a Box Standard' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Carla Pons Alcover')).not.toHaveLength(0)
    expect(
      screen.getByRole('columnheader', { name: 'Pts evento' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Pts comunidad' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', {
        name: 'Victorias / derrotas / empates',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('9', { selector: '.event-points-value' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('+10', { selector: '.community-points-value' }),
    ).toBeInTheDocument()

    const mobileRanking = screen.getByRole('region', {
      name: 'Clasificación móvil de Win a Box Standard',
    })
    const firstMobileEntry = within(mobileRanking).getAllByRole('listitem')[0]
    expect(
      within(firstMobileEntry).getByLabelText(
        '3 victorias, 0 derrotas y 0 empates',
      ),
    ).toBeInTheDocument()
    expect(
      within(firstMobileEntry).getByLabelText('9 puntos del evento'),
    ).toBeInTheDocument()
    expect(
      within(firstMobileEntry).getByLabelText('Más 10 puntos comunidad'),
    ).toBeInTheDocument()
    expect(within(firstMobileEntry).queryByText('%VPO')).not.toBeInTheDocument()

    fireEvent.click(
      within(firstMobileEntry).getByRole('button', {
        name: 'Desempates de Carla Pons Alcover',
      }),
    )

    expect(within(firstMobileEntry).getByText('%VPO')).toBeInTheDocument()
    expect(
      within(firstMobileEntry).getByRole('button', {
        name: 'Ocultar de Carla Pons Alcover',
      }),
    ).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(
      screen.getByRole('button', {
        name: /FNM Standard.*24 de julio de 2026/,
      }),
    )

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
    expect(screen.getByText('36 participantes')).toBeInTheDocument()
    expect(screen.getAllByText('Sergio Gil')).not.toHaveLength(0)
  })

  it('filters the cumulative community ranking', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }))

    expect(screen.getByRole('tab', { name: 'Comunidad' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.queryByText('El formato más activo')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Top 5 de la comunidad'),
    ).not.toBeInTheDocument()

    const rankingFilters = screen.getByText('Filtros').closest('details')
    expect(rankingFilters).not.toHaveAttribute('open')
    fireEvent.click(screen.getByText('Modificar'))
    expect(rankingFilters).toHaveAttribute('open')

    expect(
      screen.getByRole('heading', {
        name: 'MTG · Todos los formatos · Todos los eventos',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Formato')).toHaveValue('')

    const rankingTable = screen.getByRole('table', {
      name: 'Clasificación acumulada',
    })
    const rankingLegend = screen.getByRole('note', {
      name: 'Leyenda del ranking comunitario',
    })
    expect(rankingLegend).toHaveTextContent('Ev. eventos')
    expect(rankingLegend).toHaveTextContent('Vict. victorias')
    expect(rankingLegend).toHaveTextContent('Pod. podios')
    expect(rankingLegend).toHaveTextContent('Pts puntos comunidad')
    expect(
      within(rankingTable).getByText('Carla Pons Alcover'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tipo de evento'), {
      target: { value: 'event-kind-fnm' },
    })

    expect(
      screen.getByRole('heading', {
        name: 'MTG · Todos los formatos · FNM',
      }),
    ).toBeInTheDocument()
    expect(
      within(rankingTable).getByRole('row', {
        name: /1 Sergio Gil 5 2 5 38 puntos comunidad/,
      }),
    ).toBeInTheDocument()

    expect(within(rankingTable).getAllByRole('row')).toHaveLength(11)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar todos' }))
    expect(within(rankingTable).getAllByRole('row')).toHaveLength(16)
    expect(
      screen.getByRole('button', { name: 'Mostrar Top 10' }),
    ).toBeInTheDocument()
  })

  it('lets the manager configure the community ranking barometer', () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Ranking' }))

    fireEvent.change(screen.getByLabelText('Puntos para 1.º'), {
      target: { value: '12' },
    })
    fireEvent.change(screen.getByLabelText('Periodo por defecto'), {
      target: { value: '12' },
    })
    fireEvent.change(screen.getByLabelText('Jugadores mostrados'), {
      target: { value: 'all' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar configuración' }),
    )

    expect(screen.getByText('Configuración guardada.')).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().rankingSettings,
    ).toMatchObject({
      points: { first: 12 },
      defaultPeriodMonths: 12,
      defaultLimit: 'all',
    })

    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Últimos eventos' }))
    expect(
      screen.getAllByLabelText('Más 12 puntos comunidad'),
    ).not.toHaveLength(0)
  })

  it('lets the manager configure registration defaults for new MTG events', () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Inscripciones' }))

    fireEvent.change(screen.getByLabelText('Plazas por defecto para Draft'), {
      target: { value: '4' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar configuración' }),
    )

    expect(screen.getByText('Configuración guardada.')).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .registrationSettings.rules.find(
          ({ eventType }) => eventType === 'draft',
        ),
    ).toMatchObject({ defaultCapacity: 4, enabledByDefault: true })

    fireEvent.click(screen.getByRole('link', { name: 'Eventos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo evento' }))
    fireEvent.change(screen.getByLabelText('Tipo de actividad'), {
      target: { value: 'draft' },
    })

    expect(screen.getByLabelText('Plazas')).toHaveValue(4)
    expect(
      screen.getByRole('checkbox', { name: /^Activar inscripciones/ }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /^Activar lista de espera/ }),
    ).toBeChecked()
  })

  it('lets the manager review community invitations', async () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Invitaciones' }))

    expect(
      await screen.findByRole('heading', { name: 'Invitaciones' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Grupo piloto de septiembre')).toBeInTheDocument()
    expect(screen.getAllByText('Activa')).toHaveLength(2)
    expect(
      managerInvitationApiMocks.listCommunityInvitations,
    ).toHaveBeenCalledWith('community-crc-delorean', expect.any(AbortSignal))
  })

  it('connects a newly created manager invitation to player activation', async () => {
    managerInvitationApiMocks.listCommunityInvitations.mockResolvedValue({
      invitations: [],
    })
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Invitaciones' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Nueva invitación' }),
    )
    fireEvent.change(screen.getByLabelText('Nombre interno (opcional)'), {
      target: { value: 'Prueba del recorrido completo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Crear invitación' }))

    const invitationUrl = await screen.findByDisplayValue(
      `https://www.garroveta.es/#registro?invite=${validInvitationToken}`,
    )
    expect(invitationUrl).toBeInTheDocument()
    expect(
      screen.getByTitle('Código QR de la nueva invitación'),
    ).toBeInTheDocument()

    window.location.hash = `#registro?invite=${validInvitationToken}`
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
      target: { value: 'nuevo-jugador@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recibir un código' }))
    fireEvent.change(await screen.findByLabelText('Código de seis cifras'), {
      target: { value: '246810' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))

    fireEvent.change(await screen.findByLabelText('Nombre visible'), {
      target: { value: 'Nuevo Jugador' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'MTG' }))
    fireEvent.click(screen.getByLabelText(/Acepto las normas/))
    fireEvent.click(screen.getByRole('button', { name: 'Completar perfil' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Ya puedes entrar en CRC Delorean',
      }),
    ).toBeInTheDocument()
    expect(registrationApiMocks.validateInvitation).toHaveBeenCalledWith(
      validInvitationToken,
      expect.any(AbortSignal),
    )
    expect(registrationApiMocks.redeemInvitation).toHaveBeenCalledWith({
      displayName: 'Nuevo Jugador',
      favoriteGameIds: ['game-mtg'],
      invite: validInvitationToken,
      tagIds: expect.any(Array),
    })
  })

  it('lets the manager configure community identity and opening hours', () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Comunidad' }))

    fireEvent.change(screen.getByLabelText('Nombre de la comunidad'), {
      target: { value: 'CRC Delorean Inca' },
    })
    fireEvent.change(screen.getByLabelText('Ciudad'), {
      target: { value: 'Palma' },
    })
    fireEvent.change(screen.getByLabelText('Dirección (opcional)'), {
      target: { value: 'Carrer Major, 12' },
    })
    fireEvent.change(screen.getByLabelText('Correo de contacto'), {
      target: { value: 'hola@delorean.example' },
    })
    fireEvent.change(screen.getByLabelText('Sitio web'), {
      target: { value: 'https://delorean.example' },
    })
    fireEvent.change(screen.getByLabelText('URL del logo'), {
      target: { value: 'https://delorean.example/logo.png' },
    })
    fireEvent.change(screen.getByLabelText('Apertura del Miércoles'), {
      target: { value: '18:00' },
    })
    const sundayRow = screen.getByText('Domingo').closest('div')
    expect(sundayRow).toBeTruthy()
    fireEvent.click(
      within(sundayRow as HTMLElement).getByRole('checkbox', {
        name: 'Abierto',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar información' }))

    expect(screen.getByText('Información guardada.')).toBeInTheDocument()
    expect(screen.getByText('CRC Delorean Inca · Palma')).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().community,
    ).toMatchObject({
      name: 'CRC Delorean Inca',
      city: 'Palma',
      address: 'Carrer Major, 12',
      contactEmail: 'hola@delorean.example',
      websiteUrl: 'https://delorean.example',
      logoUrl: 'https://delorean.example/logo.png',
      openingHours: expect.arrayContaining([
        { day: 'wednesday', opensAt: '18:00', closesAt: '24:00' },
        { day: 'sunday' },
      ]),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Volver al perfil' }))
    expect(screen.getByText('Carrer Major, 12')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'hola@delorean.example' }),
    ).toHaveAttribute('href', 'mailto:hola@delorean.example')
    expect(screen.getByRole('link', { name: 'Web' })).toHaveAttribute(
      'href',
      'https://delorean.example',
    )
  })

  it('loads and manages the real community members for the manager', async () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Miembros' }))
    await screen.findByText('Lucas Muntaner')

    expect(managerMemberApiMocks.listCommunityMembers).toHaveBeenCalledWith(
      'community-crc-delorean',
      expect.any(AbortSignal),
    )
    fireEvent.change(screen.getByLabelText('Buscar miembros'), {
      target: { value: 'lucas@example.com' },
    })

    const pendingMember = screen.getByText('Lucas Muntaner').closest('article')
    expect(pendingMember).toBeTruthy()
    expect(
      within(pendingMember as HTMLElement).getByText(
        'lucas@example.com · Pendiente',
      ),
    ).toBeInTheDocument()
    fireEvent.click(
      within(pendingMember as HTMLElement).getByRole('button', {
        name: 'Aceptar',
      }),
    )
    await waitFor(() =>
      expect(managerMemberApiMocks.updateCommunityMember).toHaveBeenCalledWith(
        'community-crc-delorean',
        'member-lucas',
        { status: 'approved' },
      ),
    )

    fireEvent.change(screen.getByLabelText('Buscar miembros'), {
      target: { value: 'Marta Soler' },
    })
    const marta = screen.getByText('Marta Soler').closest('article')
    expect(marta).toBeTruthy()
    fireEvent.change(
      within(marta as HTMLElement).getByLabelText('Rol de Marta Soler'),
      { target: { value: 'moderator' } },
    )
    await waitFor(() =>
      expect(managerMemberApiMocks.updateCommunityMember).toHaveBeenCalledWith(
        'community-crc-delorean',
        'member-marta',
        { role: 'moderator' },
      ),
    )
    fireEvent.click(within(marta as HTMLElement).getByText(/^Etiquetas/))
    fireEvent.click(
      within(marta as HTMLElement).getByRole('checkbox', { name: 'Pauper' }),
    )
    await waitFor(() =>
      expect(managerMemberApiMocks.updateCommunityMember).toHaveBeenCalledWith(
        'community-crc-delorean',
        'member-marta',
        { tagIds: ['tag-draft', 'tag-pauper'] },
      ),
    )

    fireEvent.change(
      within(marta as HTMLElement).getByLabelText('Rol de Marta Soler'),
      { target: { value: 'manager' } },
    )
    expect(
      within(marta as HTMLElement).getByText(
        /¿Dar permisos de gerente a Marta Soler\?/,
      ),
    ).toBeInTheDocument()
    expect(
      managerMemberApiMocks.updateCommunityMember,
    ).not.toHaveBeenCalledWith('community-crc-delorean', 'member-marta', {
      role: 'manager',
    })
    fireEvent.click(
      within(marta as HTMLElement).getByRole('button', {
        name: 'Confirmar promoción',
      }),
    )
    await waitFor(() =>
      expect(managerMemberApiMocks.updateCommunityMember).toHaveBeenCalledWith(
        'community-crc-delorean',
        'member-marta',
        { role: 'manager' },
      ),
    )

    fireEvent.change(
      within(marta as HTMLElement).getByLabelText('Rol de Marta Soler'),
      { target: { value: 'moderator' } },
    )
    expect(
      within(marta as HTMLElement).getByText(
        '¿Retirar los permisos de gerente de Marta Soler?',
      ),
    ).toBeInTheDocument()
    fireEvent.click(
      within(marta as HTMLElement).getByRole('button', {
        name: 'Confirmar cambio de rol',
      }),
    )
    await waitFor(() =>
      expect(managerMemberApiMocks.updateCommunityMember).toHaveBeenCalledWith(
        'community-crc-delorean',
        'member-marta',
        { role: 'moderator' },
      ),
    )

    fireEvent.click(
      within(marta as HTMLElement).getByRole('button', {
        name: 'Suspender a Marta Soler',
      }),
    )
    expect(
      within(marta as HTMLElement).getByText(/¿Suspender a Marta Soler\?/),
    ).toBeInTheDocument()
    expect(
      managerMemberApiMocks.updateCommunityMember,
    ).not.toHaveBeenCalledWith('community-crc-delorean', 'member-marta', {
      status: 'suspended',
    })
    fireEvent.click(
      within(marta as HTMLElement).getByRole('button', {
        name: 'Confirmar suspensión',
      }),
    )
    await waitFor(() =>
      expect(managerMemberApiMocks.updateCommunityMember).toHaveBeenCalledWith(
        'community-crc-delorean',
        'member-marta',
        { status: 'suspended' },
      ),
    )
  })

  it('lets the manager create, share, edit, pin and delete publications', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Publicaciones' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nueva' }))

    fireEvent.change(screen.getByLabelText('Tipo de comunicación'), {
      target: { value: 'urgent' },
    })
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Cambio de horario' },
    })
    fireEvent.change(screen.getByLabelText('Resumen'), {
      target: { value: 'La tienda abrirá una hora más tarde.' },
    })
    fireEvent.change(screen.getByLabelText('Contenido'), {
      target: { value: 'Consulta el nuevo horario antes de venir.' },
    })
    fireEvent.click(screen.getByLabelText('Pauper'))
    fireEvent.click(
      screen.getByLabelText('Fijar como comunicación prioritaria'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText('Publicación guardada.')).toBeInTheDocument()
    expect(
      communityCommunicationApiMocks.createCommunityCommunication,
    ).toHaveBeenCalledWith(
      'community-crc-delorean',
      expect.objectContaining({
        pinned: true,
        tagIds: ['tag-pauper'],
        title: 'Cambio de horario',
        type: 'urgent',
      }),
    )
    expect(
      screen.getByRole('button', { name: 'Copiar para WhatsApp' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ver la publicación' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
    const publishedRow = screen
      .getByText('Cambio de horario')
      .closest('article')
    expect(publishedRow).toBeTruthy()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .newsPosts.find(({ title }) => title === 'Cambio de horario'),
    ).toMatchObject({ type: 'urgent', tagIds: ['tag-pauper'], pinned: true })

    fireEvent.click(
      screen.getByRole('button', { name: 'Copiar para WhatsApp' }),
    )
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('📣 *Cambio de horario*'),
      ),
    )
    expect(
      screen.getByText('Publicación copiada. Ya puedes pegarla en WhatsApp.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    fireEvent.click(
      within(publishedRow as HTMLElement).getByRole('button', {
        name: 'Modificar Cambio de horario',
      }),
    )
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Horario actualizado' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByText('Publicación actualizada.'),
    ).toBeInTheDocument()
    expect(
      communityCommunicationApiMocks.updateCommunityCommunication,
    ).toHaveBeenNthCalledWith(
      1,
      'community-crc-delorean',
      'communication-cambio-de-horario',
      expect.objectContaining({
        pinned: true,
        title: 'Horario actualizado',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    const updatedRow = screen
      .getByText('Horario actualizado')
      .closest('article')
    expect(updatedRow).toBeTruthy()
    fireEvent.click(
      within(updatedRow as HTMLElement).getByRole('button', {
        name: 'Desfijar Horario actualizado',
      }),
    )
    expect(
      await screen.findByText('Comunicación desfijada.'),
    ).toBeInTheDocument()
    expect(
      communityCommunicationApiMocks.updateCommunityCommunication,
    ).toHaveBeenNthCalledWith(
      2,
      'community-crc-delorean',
      'communication-cambio-de-horario',
      expect.objectContaining({ pinned: false, title: 'Horario actualizado' }),
    )
    fireEvent.click(
      within(updatedRow as HTMLElement).getByRole('button', {
        name: 'Eliminar Horario actualizado',
      }),
    )
    fireEvent.click(
      within(updatedRow as HTMLElement).getByRole('button', {
        name: 'Confirmar',
      }),
    )

    await waitFor(() =>
      expect(screen.queryByText('Horario actualizado')).not.toBeInTheDocument(),
    )
    expect(
      communityCommunicationApiMocks.deleteCommunityCommunication,
    ).toHaveBeenCalledWith(
      'community-crc-delorean',
      'communication-cambio-de-horario',
    )
    await waitFor(() =>
      expect(
        createLocalDemoRepository(window.localStorage)
          .load()
          .newsPosts.some(({ title }) => title === 'Horario actualizado'),
      ).toBe(false),
    )
  })

  it('opens an event detail and returns to the agenda', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const standardCard = screen
      .getByRole('heading', { name: 'FNM Standard' })
      .closest('article')
    fireEvent.click(
      within(standardCard as HTMLElement).getByRole('button', {
        name: 'Ver detalles',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'FNM Standard' }),
    ).toBeInTheDocument()
    expect(screen.getByText('CRC Delorean')).toBeInTheDocument()
    expect(screen.queryByText(/confirmadas/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Inscribirme/ }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la agenda' }))

    expect(
      screen.getByRole('heading', { name: 'Próximos eventos' }),
    ).toBeInTheDocument()
  })

  it('switches between the illustrated agenda and compact event list', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)

    expect(
      screen.getByRole('img', {
        name: 'Cartel de Store Championship Dragon Ball',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))

    expect(
      screen.getByRole('group', {
        name: 'Próximos eventos en vista de lista',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Ver FNM Standard, 31 jul a las 18:00/i,
      }),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem('events:view-mode')).toBe('list')
  })

  it('filters events by game and activity', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'One Piece' }))

    expect(
      screen.getByRole('heading', {
        name: 'Store Championship One Piece',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'FNM Standard' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Torneo' }))

    expect(screen.getByText('1 programados')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }))

    expect(
      screen.getByRole('heading', { name: 'FNM Standard' }),
    ).toBeInTheDocument()
  })

  it('filters events with the compact mobile controls', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filtrar por juego' }),
      {
        target: { value: 'game-one-piece' },
      },
    )
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filtrar por actividad' }),
      { target: { value: 'tournament' } },
    )

    expect(
      screen.getByRole('heading', {
        name: 'Store Championship One Piece',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 programados')).toBeInTheDocument()
  })

  it('saves account data and preferences together from the profile', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))

    expect(screen.getByLabelText('Correo electrónico')).toHaveValue(
      'alex@example.com',
    )
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute(
      'readonly',
    )

    const nameInput = screen.getByLabelText('Nombre visible')
    const gundamButton = screen.getByRole('button', { name: /Gundam/ })
    const pauperButton = screen.getByRole('button', { name: 'Pauper' })

    expect(nameInput).toHaveValue('Álex Romero')
    expect(gundamButton).toHaveAttribute('aria-pressed', 'false')
    expect(pauperButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.change(nameInput, { target: { value: 'Álex Romero Vidal' } })
    fireEvent.click(gundamButton)
    fireEvent.click(pauperButton)

    const updatedUser = buildCurrentUser()
    updatedUser.memberships[0] = {
      ...updatedUser.memberships[0],
      displayName: 'Álex Romero Vidal',
      favoriteGameIds: ['game-mtg', 'game-one-piece', 'game-gundam'],
      tagIds: ['tag-commander', 'tag-intercambios', 'tag-pauper'],
    }
    currentUserHookMocks.refresh.mockResolvedValue(updatedUser)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(currentUserApiMocks.updateCurrentMembership).toHaveBeenCalledWith({
        communityId: 'community-crc-delorean',
        displayName: 'Álex Romero Vidal',
        favoriteGameIds: ['game-mtg', 'game-one-piece', 'game-gundam'],
        tagIds: ['tag-commander', 'tag-intercambios', 'tag-pauper'],
      }),
    )
    expect(currentUserHookMocks.refresh).toHaveBeenCalled()
    expect(
      await screen.findByText('Cuenta y preferencias actualizadas.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Álex Romero Vidal' }),
    ).toBeInTheDocument()
  })

  it('closes the session and returns to member access', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    currentUserHookMocks.refresh.mockResolvedValue(null)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() =>
      expect(authenticationApiMocks.signOutCurrentUser).toHaveBeenCalledOnce(),
    )
    expect(currentUserHookMocks.refresh).toHaveBeenCalled()
    expect(
      await screen.findByRole('heading', { name: 'Entra en tu comunidad' }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#acceso')
  })

  it('restores the persisted membership after signing in again with OTP', async () => {
    const returningUser = buildCurrentUser()
    returningUser.memberships[0] = {
      ...returningUser.memberships[0],
      displayName: 'Álex Romero Vidal',
      favoriteGameIds: ['game-mtg', 'game-gundam'],
      tagIds: ['tag-pauper'],
    }
    currentUserHookMocks.refresh
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(returningUser)
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(
      await screen.findByRole('heading', { name: 'Entra en tu comunidad' }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'alex@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recibir un código' }))
    expect(
      await screen.findByRole('heading', { name: 'Código de verificación' }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Código de seis cifras'), {
      target: { value: '246810' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(
      await screen.findByRole('heading', { name: 'Hola, Álex' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    expect(screen.getByLabelText('Nombre visible')).toHaveValue(
      'Álex Romero Vidal',
    )
    expect(screen.getByRole('button', { name: /Gundam/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Pauper' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps the profile visible when closing the session fails', async () => {
    authenticationApiMocks.signOutCurrentUser.mockRejectedValue(
      new ClientApiError(500, 'SIGN_OUT_FAILED', 'Session unavailable'),
    )
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se ha podido cerrar la sesión. Inténtalo de nuevo.',
    )
    expect(currentUserHookMocks.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Perfil' })).toBeInTheDocument()
  })

  it('lets a manager maintain configurable community options', () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))

    const optionManager = screen
      .getByRole('heading', { name: 'Configuración de la comunidad' })
      .closest('section')
    expect(optionManager).toBeTruthy()
    expect(
      within(optionManager as HTMLElement).getAllByRole('tab'),
    ).toHaveLength(4)
    fireEvent.click(
      within(optionManager as HTMLElement).getByRole('tab', {
        name: /Tipos de evento/,
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Añadir tipo de evento' }),
    )
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Regional Qualifier' },
    })
    fireEvent.change(screen.getByLabelText('Nombre corto'), {
      target: { value: 'RCQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    const createdOption = screen
      .getByText('Regional Qualifier')
      .closest('article')
    expect(createdOption).toBeTruthy()
    expect(
      within(createdOption as HTMLElement).getByRole('button', {
        name: 'Eliminar definitivamente Regional Qualifier',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Eliminar definitivamente Friday Night Magic',
      }),
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(createdOption as HTMLElement).getByRole('button', {
        name: 'Modificar Regional Qualifier',
      }),
    )
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Regional Championship Qualifier' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    const updatedOption = screen
      .getByText('Regional Championship Qualifier')
      .closest('article')
    fireEvent.click(
      within(updatedOption as HTMLElement).getByRole('button', {
        name: 'Desactivar Regional Championship Qualifier',
      }),
    )
    expect(
      within(updatedOption as HTMLElement).getByText('Desactivada'),
    ).toBeInTheDocument()
    fireEvent.click(
      within(updatedOption as HTMLElement).getByRole('button', {
        name: 'Subir Regional Championship Qualifier',
      }),
    )

    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .competitionEventKinds.at(-2),
    ).toMatchObject({
      name: 'Regional Championship Qualifier',
      isActive: false,
    })

    fireEvent.click(
      within(updatedOption as HTMLElement).getByRole('button', {
        name: 'Eliminar definitivamente Regional Championship Qualifier',
      }),
    )
    fireEvent.click(
      within(updatedOption as HTMLElement).getByRole('button', {
        name: 'Eliminar',
      }),
    )
    expect(screen.queryByText('Regional Championship Qualifier')).toBeNull()
  })

  it('keeps deactivated options in history but removes them from new forms', () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuración' }))

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Desactivar One Piece Card Game',
      }),
    )

    fireEvent.click(screen.getByRole('link', { name: 'Eventos' }))
    expect(
      screen.getByRole('heading', {
        name: 'Store Championship One Piece',
      }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo evento' }))

    expect(
      within(screen.getByLabelText('Juego')).queryByRole('option', {
        name: 'One Piece Card Game',
      }),
    ).not.toBeInTheDocument()
  })

  it('registers an invited member with an OTP and no password', async () => {
    window.location.hash = `#registro?invite=${validInvitationToken}`
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Únete a la comunidad' }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#registro')
    expect(
      window.sessionStorage.getItem('garroveta.registration.invitation'),
    ).toBe(validInvitationToken)
    expect(screen.getByText('Acceso por invitación')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Garroveta, inicio' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Volver al inicio' }),
    ).toBeNull()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'pep@example.com' },
    })
    expect(screen.queryByLabelText(/Contraseña/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Recibir un código' }))

    expect(
      await screen.findByRole('heading', { name: 'Código de verificación' }),
    ).toBeInTheDocument()
    expect(registrationApiMocks.sendSignInOtp).toHaveBeenCalledWith(
      'pep@example.com',
    )
    expect(screen.getByText(/Caduca en 10:00/)).toBeInTheDocument()
    expect(screen.getByText('3 intentos disponibles')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Código de seis cifras'), {
      target: { value: '246810' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))

    fireEvent.change(await screen.findByLabelText('Nombre visible'), {
      target: { value: 'Pep Peralta Isern' },
    })
    const completeProfile = screen.getByRole('button', {
      name: 'Completar perfil',
    })
    expect(completeProfile).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'MTG' }))
    fireEvent.click(screen.getByLabelText(/Acepto las normas/))
    expect(completeProfile).toBeEnabled()
    fireEvent.click(completeProfile)

    expect(
      await screen.findByRole('heading', {
        name: 'Ya puedes entrar en CRC Delorean',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No necesitas recordar/)).toBeInTheDocument()
    expect(registrationApiMocks.redeemInvitation).toHaveBeenCalledWith({
      displayName: 'Pep Peralta Isern',
      favoriteGameIds: ['game-mtg'],
      invite: validInvitationToken,
      tagIds: expect.any(Array),
    })
    expect(
      window.sessionStorage.getItem('garroveta.registration.invitation'),
    ).toBeNull()
  })

  it('keeps the invitation and profile choices when the session expires before activation', async () => {
    registrationApiMocks.redeemInvitation.mockRejectedValueOnce(
      new ClientApiError(401, 'unauthorized', 'Session expired'),
    )
    window.location.hash = `#registro?invite=${validInvitationToken}`
    render(<App />)

    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
      target: { value: 'pep@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recibir un código' }))
    fireEvent.change(await screen.findByLabelText('Código de seis cifras'), {
      target: { value: '246810' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))

    fireEvent.change(await screen.findByLabelText('Nombre visible'), {
      target: { value: 'Pep Peralta Isern' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'MTG' }))
    fireEvent.click(screen.getByLabelText(/Acepto las normas/))
    fireEvent.click(screen.getByRole('button', { name: 'Completar perfil' }))

    expect(
      await screen.findByText(
        /Tu sesión ha caducado antes de activar el acceso/,
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue(
      'pep@example.com',
    )
    expect(
      window.sessionStorage.getItem('garroveta.registration.invitation'),
    ).toBe(validInvitationToken)

    fireEvent.click(screen.getByRole('button', { name: 'Recibir un código' }))
    fireEvent.change(await screen.findByLabelText('Código de seis cifras'), {
      target: { value: '246810' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(await screen.findByLabelText('Nombre visible')).toHaveValue(
      'Pep Peralta Isern',
    )
    expect(screen.getByRole('button', { name: 'MTG' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText(/Acepto las normas/)).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Completar perfil' }))
    expect(
      await screen.findByRole('heading', {
        name: 'Ya puedes entrar en CRC Delorean',
      }),
    ).toBeInTheDocument()
    expect(registrationApiMocks.redeemInvitation).toHaveBeenCalledTimes(2)
  })

  it('lets an existing member open a session with email and OTP', async () => {
    const currentUser = buildCurrentUser()
    currentUserHookMocks.current = {
      data: null,
      status: 'unauthenticated',
    }
    currentUserHookMocks.refresh.mockResolvedValue(currentUser)
    window.location.hash = '#acceso'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Entra en tu comunidad' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Acceso privado')).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Garroveta, inicio' }),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'miembro@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recibir un código' }))

    expect(
      await screen.findByRole('heading', { name: 'Código de verificación' }),
    ).toBeInTheDocument()
    expect(registrationApiMocks.sendSignInOtp).toHaveBeenCalledWith(
      'miembro@example.com',
    )

    fireEvent.change(screen.getByLabelText('Código de seis cifras'), {
      target: { value: '246810' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(
      await screen.findByRole('heading', { name: 'Hola, Álex' }),
    ).toBeInTheDocument()
    expect(registrationApiMocks.verifySignInOtp).toHaveBeenCalledWith(
      'miembro@example.com',
      '246810',
    )
    expect(window.location.hash).toBe('#inicio')
  })

  it('keeps the requested route while an unauthenticated member signs in', async () => {
    const currentUser = buildCurrentUser()
    currentUserHookMocks.current = {
      data: null,
      status: 'unauthenticated',
    }
    currentUserHookMocks.refresh.mockResolvedValue(currentUser)
    window.location.hash = '#cartas?view=market'

    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Entra en tu comunidad' }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#cartas?view=market')
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'alex@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recibir un código' }))
    fireEvent.change(await screen.findByLabelText('Código de seis cifras'), {
      target: { value: '246810' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(
      await screen.findByRole('heading', { name: 'Cartas disponibles' }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#cartas?view=market')
  })

  it.each([
    ['pending', 'Tu acceso está pendiente'],
    ['suspended', 'Tu acceso está suspendido'],
  ] as const)('blocks a %s community membership', (status, heading) => {
    const currentUser = buildCurrentUser('player', status)
    currentUserHookMocks.current = {
      data: currentUser,
      status: 'authenticated',
    }

    render(<App />)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
  })

  it('blocks an account without a membership in the pilot community', () => {
    const currentUser = buildCurrentUser()
    currentUser.memberships = []
    currentUserHookMocks.current = {
      data: currentUser,
      status: 'authenticated',
    }

    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Aún no tienes acceso' }),
    ).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
  })

  it('lets a member retry when the access check fails', async () => {
    const currentUser = buildCurrentUser()
    currentUserHookMocks.current = { data: null, status: 'error' }
    currentUserHookMocks.refresh.mockResolvedValue(currentUser)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Volver a intentarlo' }))

    expect(
      await screen.findByRole('heading', { name: 'Hola, Álex' }),
    ).toBeInTheDocument()
  })

  it('does not expose registration from the connected profile', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))

    expect(screen.queryByText('Probar el alta de un nuevo miembro')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Crear cuenta' })).toBeNull()
  })

  it('locks OTP verification after three incorrect attempts', async () => {
    window.location.hash = `#registro?invite=${validInvitationToken}`
    render(<App />)

    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
      target: { value: 'invitado@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recibir un código' }))

    const otpField = await screen.findByLabelText('Código de seis cifras')
    const verifyButton = screen.getByRole('button', {
      name: 'Verificar código',
    })

    for (let attempt = 0; attempt < 3; attempt += 1) {
      fireEvent.change(otpField, { target: { value: '111111' } })
      fireEvent.click(verifyButton)
      await waitFor(() =>
        expect(registrationApiMocks.verifySignInOtp).toHaveBeenCalledTimes(
          attempt + 1,
        ),
      )
      await waitFor(() =>
        expect(
          screen.getByText(`${2 - attempt} intentos disponibles`),
        ).toBeInTheDocument(),
      )
    }

    expect(
      screen.getByText(
        'Has agotado los tres intentos. Solicita un código nuevo.',
      ),
    ).toBeInTheDocument()
    expect(otpField).toBeDisabled()
    expect(verifyButton).toBeDisabled()
  })

  it('requires a valid invitation before showing registration', async () => {
    window.location.hash = '#registro'
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Necesitas una invitación' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Correo electrónico')).toBeNull()
    expect(registrationApiMocks.validateInvitation).not.toHaveBeenCalled()
  })

  it('identifies a network failure while validating an invitation and retries', async () => {
    registrationApiMocks.validateInvitation.mockRejectedValueOnce(
      new ClientApiError(
        0,
        'network_error',
        'No se ha podido conectar con el servidor.',
      ),
    )
    window.location.hash = `#registro?invite=${validInvitationToken}`
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Sin conexión' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Comprueba tu conexión a internet/),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a intentarlo' }))

    expect(
      await screen.findByRole('heading', { name: 'Únete a la comunidad' }),
    ).toBeInTheDocument()
    expect(registrationApiMocks.validateInvitation).toHaveBeenCalledTimes(2)
  })

  it('blocks an expired invitation before requesting an OTP', async () => {
    registrationApiMocks.validateInvitation.mockResolvedValueOnce({
      community: { city: 'Inca', name: 'CRC Delorean' },
      expiresAt: '2026-08-01T12:00:00.000Z',
      status: 'expired',
    })
    window.location.hash = `#registro?invite=${validInvitationToken}`
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'La invitación ha caducado',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Correo electrónico')).toBeNull()
    expect(
      window.sessionStorage.getItem('garroveta.registration.invitation'),
    ).toBeNull()
    expect(registrationApiMocks.sendSignInOtp).not.toHaveBeenCalled()
  })

  it.each([
    ['revoked', 'La invitación ya no está activa'],
    ['used', 'Invitación ya utilizada'],
  ] as const)(
    'blocks a %s invitation before requesting an OTP',
    async (status, heading) => {
      registrationApiMocks.validateInvitation.mockResolvedValueOnce({
        community: { city: 'Inca', name: 'CRC Delorean' },
        expiresAt: '2026-09-27T12:00:00.000Z',
        status,
      })
      window.location.hash = `#registro?invite=${validInvitationToken}`
      render(<App />)

      expect(
        await screen.findByRole('heading', { name: heading }),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('Correo electrónico')).toBeNull()
      expect(
        window.sessionStorage.getItem('garroveta.registration.invitation'),
      ).toBeNull()
      expect(registrationApiMocks.sendSignInOtp).not.toHaveBeenCalled()
    },
  )

  it('shows the operational dashboard with real pending members', async () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))

    expect(
      screen.getByRole('heading', { name: 'Hola, Tomás' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Por revisar' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Acciones rápidas' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('1 solicitud de acceso')).toBeInTheDocument()
    expect(screen.getByText('Lucas Muntaner')).toBeInTheDocument()
    expect(managerMemberApiMocks.listCommunityMembers).toHaveBeenCalledWith(
      'community-crc-delorean',
      expect.any(AbortSignal),
    )
    expect(
      screen.getByText('3 personas en lista de espera.'),
    ).toBeInTheDocument()
    const waitlistMetric = screen
      .getByText('En lista de espera')
      .closest('article')
    expect(
      within(waitlistMetric as HTMLElement).getByText('4'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '2 coincidencias nuevas' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Revisar solicitudes' }))
    expect(screen.getByRole('tab', { name: 'Miembros' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))
    fireEvent.click(screen.getByRole('link', { name: /Nuevo evento/ }))
    expect(
      screen.getByRole('heading', { name: 'Crear un evento' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))
    fireEvent.click(screen.getByRole('link', { name: /Nueva publicación/ }))
    expect(screen.getByRole('tab', { name: 'Publicaciones' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('offers EventLink result imports only for MTG events', () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Eventos' }))

    expect(
      screen.getByRole('button', {
        name: 'Importar resultados de FNM Standard',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Importar resultados de Store Championship Dragon Ball',
      }),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Importar resultados de FNM Standard',
      }),
    )

    const importPanel = screen.getByRole('region', { name: 'FNM Standard' })
    expect(
      within(importPanel).getByText('HTML · máximo 5 MB'),
    ).toBeInTheDocument()
  })

  it('shows an imported EventLink result and updates the community ranking', async () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Eventos' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Importar resultados de Presentación: The Hobbit',
      }),
    )

    const importPanel = screen.getByRole('region', {
      name: 'Presentación: The Hobbit',
    })
    const file = new File([importedEventLinkHtml], 'eventlink.html', {
      type: 'text/html',
    })
    Object.defineProperty(file, 'text', {
      value: async () => importedEventLinkHtml,
    })
    fireEvent.change(importPanel.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    })

    expect(await within(importPanel).findByText('2/2')).toBeInTheDocument()
    fireEvent.click(
      within(importPanel).getByRole('button', {
        name: 'Importar clasificación',
      }),
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Ver clasificación' }),
    )

    expect(
      screen.getByRole('tab', { name: 'Últimos eventos' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('heading', { name: 'Presentación: The Hobbit' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Pep Peralta Isern')).not.toHaveLength(0)

    fireEvent.click(screen.getByRole('tab', { name: 'Comunidad' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar todos' }))
    expect(
      within(
        screen.getByRole('table', { name: 'Clasificación acumulada' }),
      ).getByText('Pep Peralta Isern'),
    ).toBeInTheDocument()
  })

  it('registers for an available event and cancels the registration', async () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const draftCard = screen
      .getByRole('heading', { name: 'Draft Night MTG' })
      .closest('article')

    fireEvent.click(
      within(draftCard as HTMLElement).getByRole('button', {
        name: 'Ver detalles',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Inscribirme' }))

    expect(
      await screen.findByText('Tu plaza está confirmada.'),
    ).toBeInTheDocument()
    expect(screen.getByText('7/8 confirmadas')).toBeInTheDocument()
    expect(
      communityEventApiMocks.registerForPersistedEvent,
    ).toHaveBeenCalledWith('community-crc-delorean', 'event-mtg-draft-night')
    expect(
      screen.getByRole('button', { name: 'Cancelar inscripción' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Cancelar inscripción' }),
    )

    expect(
      await screen.findByText('Tu inscripción se ha cancelado.'),
    ).toBeInTheDocument()
    expect(screen.getByText('6/8 confirmadas')).toBeInTheDocument()
    expect(
      communityEventApiMocks.cancelPersistedEventRegistration,
    ).toHaveBeenCalledWith('community-crc-delorean', 'event-mtg-draft-night')
  })

  it('leaves and rejoins the waitlist of a full event', async () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const presentationCard = screen
      .getByRole('heading', { name: 'Presentación: The Hobbit' })
      .closest('article')

    fireEvent.click(
      within(presentationCard as HTMLElement).getByRole('button', {
        name: 'Ver detalles',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Salir de la lista de espera' }),
    )

    expect(
      await screen.findByText('Has salido de la lista de espera.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('2 personas en lista de espera'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Unirme a la lista de espera',
      }),
    )

    expect(
      await screen.findByText('Te has unido a la lista de espera.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('3 personas en lista de espera'),
    ).toBeInTheDocument()
    expect(
      communityEventApiMocks.registerForPersistedEvent,
    ).toHaveBeenCalledWith(
      'community-crc-delorean',
      'event-presentation-hobbit',
    )
  })

  it('browses the news feed and opens a publication', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)

    expect(
      screen.getByRole('heading', { name: 'Publicaciones para ti' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Nuevo horario de verano' }),
    ).toBeInTheDocument()

    const summerNews = screen
      .getByRole('heading', { name: 'Nuevo horario de verano' })
      .closest('article')
    fireEvent.click(
      within(summerNews as HTMLElement).getByRole('button', { name: 'Leer' }),
    )

    expect(
      screen.getByText(/Durante el verano abrimos los miércoles y jueves/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Volver a las noticias' }),
    ).toBeInTheDocument()
  })

  it('replaces prototype news with persisted community communications', () => {
    render(<App />)

    const hookOptions = communityCommunicationsHookMocks.invoke.mock.calls.at(
      -1,
    )?.[0] as {
      communityId: string
      enabled: boolean
      onLoaded: (communications: CommunityCommunication[]) => void
    }
    const persistedCommunication: CommunityCommunication = {
      authorDisplayName: 'Tomás',
      authorMemberId: 'member-tomas',
      communityId: 'community-crc-delorean',
      content: 'Contenido guardado en la base de datos.',
      excerpt: 'Resumen guardado en la base de datos.',
      id: 'communication-persisted',
      pinned: true,
      publishedAt: '2026-09-02T10:00:00.000Z',
      tagIds: [],
      title: 'Aviso persistido',
      type: 'news',
    }

    expect(hookOptions).toMatchObject({
      communityId: 'community-crc-delorean',
      enabled: true,
    })
    act(() => hookOptions.onLoaded([persistedCommunication]))
    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)

    expect(
      screen.getByRole('heading', { name: 'Aviso persistido' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Nuevo horario de verano' }),
    ).not.toBeInTheDocument()
  })

  it('offers to retry when persisted communications cannot be loaded', () => {
    communityCommunicationsHookMocks.status = 'error'
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)

    expect(
      screen.getByRole('heading', { name: 'Ha ocurrido un error' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(communityCommunicationsHookMocks.reload).toHaveBeenCalledOnce()
  })

  it('switches between personalized news and tag filters', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)

    expect(
      screen.queryByRole('heading', {
        name: '¿Qué formato quieres jugar en agosto?',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Commander, Intercambios/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }))

    expect(
      screen.getByRole('heading', {
        name: '¿Qué formato quieres jugar en agosto?',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Commander' }))

    expect(
      screen.getByRole('heading', { name: 'Nuevas mesas para Commander' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Reposición de sobres y accesorios',
      }),
    ).not.toBeInTheDocument()
  })

  it('filters all news with the compact mobile selector', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }))
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Filtrar publicaciones por etiqueta',
      }),
      { target: { value: 'tag-commander' } },
    )

    expect(
      screen.getByRole('heading', { name: 'Nuevas mesas para Commander' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Reposición de sobres y accesorios',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Restablecer' }),
    ).toBeInTheDocument()
  })

  it('centralizes publication management and opens a saved news item', async () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Noticias/ }).at(-1)!)
    expect(
      screen.queryByRole('button', { name: 'Nueva publicación' }),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Gestionar publicaciones' }),
    )

    expect(screen.getByRole('tab', { name: 'Publicaciones' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Nueva' }))

    fireEvent.change(screen.getByLabelText('Tipo de comunicación'), {
      target: { value: 'urgent' },
    })
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Cambio de sala' },
    })
    fireEvent.change(screen.getByLabelText('Resumen'), {
      target: { value: 'El torneo se jugará en la sala principal.' },
    })
    fireEvent.change(screen.getByLabelText('Contenido'), {
      target: {
        value:
          'Por motivos de organización, todas las rondas se jugarán en la sala principal.',
      },
    })
    fireEvent.click(screen.getByLabelText('Commander'))
    fireEvent.click(
      screen.getByLabelText('Fijar como comunicación prioritaria'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText('Publicación guardada.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver la publicación' }))
    expect(
      screen.getByRole('heading', { name: 'Cambio de sala' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Por motivos de organización, todas las rondas se jugarán en la sala principal.',
      ),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().newsPosts.at(-1),
    ).toMatchObject({
      title: 'Cambio de sala',
      type: 'urgent',
      tagIds: ['tag-commander'],
      pinned: true,
    })
  })

  it('lets a manager publish a multi-game event', async () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo evento' }))

    fireEvent.change(screen.getByLabelText('Juego'), {
      target: { value: 'game-one-piece' },
    })
    fireEvent.change(screen.getByLabelText('Tipo de actividad'), {
      target: { value: 'league' },
    })
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Liga One Piece' },
    })
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: 'Cuatro jornadas abiertas a la comunidad.' },
    })
    fireEvent.click(screen.getByLabelText('Principiantes'))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar evento' }))

    expect(
      await screen.findByText('El evento ya aparece en la agenda.'),
    ).toBeInTheDocument()
    expect(communityEventApiMocks.createCommunityEvent).toHaveBeenCalledWith(
      'community-crc-delorean',
      expect.objectContaining({
        gameId: 'game-one-piece',
        title: 'Liga One Piece',
        type: 'league',
      }),
    )
    expect(
      screen.getAllByRole('heading', { name: 'Liga One Piece' })[0],
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().events.at(-1),
    ).toMatchObject({
      gameId: 'game-one-piece',
      type: 'league',
      title: 'Liga One Piece',
      registrationEnabled: false,
      capacity: 0,
      tagIds: ['tag-principiantes'],
    })
  })

  it('lets a manager inspect registrations and release a participant place', async () => {
    communityEventApiMocks.listPersistedEventRegistrations
      .mockResolvedValueOnce({
        registrations: [
          {
            displayName: 'Sergio Gil',
            eventId: 'event-mtg-draft-express',
            id: 'registration-sergio-draft-express',
            initials: 'SG',
            memberId: 'member-sergio',
            registeredAt: '2026-07-24T21:15:00+02:00',
            status: 'confirmed',
          },
        ],
      })
      .mockResolvedValueOnce({ registrations: [] })
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)
    const draftCard = screen
      .getByRole('heading', { name: 'Draft express MTG' })
      .closest('article')
    fireEvent.click(
      within(draftCard as HTMLElement).getByRole('button', {
        name: /Inscripciones/,
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Participantes' }),
    ).toBeInTheDocument()
    const sergioParticipant = (await screen.findByText('Sergio Gil')).closest(
      'article',
    )
    expect(
      within(sergioParticipant as HTMLElement).queryByRole('button', {
        name: 'Registrar asistencia',
      }),
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(sergioParticipant as HTMLElement).getByRole('button', {
        name: 'Liberar plaza',
      }),
    )

    await waitFor(() => expect(sergioParticipant).not.toBeInTheDocument())
    expect(
      communityEventApiMocks.removePersistedEventRegistration,
    ).toHaveBeenCalledWith(
      'community-crc-delorean',
      'event-mtg-draft-express',
      'member-sergio',
    )
  })

  it('lets a manager edit, inspect registrations and delete events', async () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)

    const eventRow = screen
      .getByRole('heading', { name: 'Presentación: The Hobbit' })
      .closest('article')
    fireEvent.click(
      within(eventRow as HTMLElement).getByRole('button', {
        name: /Inscripciones/,
      }),
    )
    expect(await screen.findByText('Sergio Gil')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    fireEvent.click(
      within(eventRow as HTMLElement).getByRole('button', {
        name: 'Modificar Presentación: The Hobbit',
      }),
    )
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Presentación: The Hobbit · tarde' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByText('Los cambios se han guardado.'),
    ).toBeInTheDocument()
    expect(
      communityEventApiMocks.updatePersistedCommunityEvent,
    ).toHaveBeenCalledWith(
      'community-crc-delorean',
      'event-presentation-hobbit',
      expect.objectContaining({
        title: 'Presentación: The Hobbit · tarde',
      }),
    )

    const updatedRow = screen
      .getByRole('heading', { name: 'Presentación: The Hobbit · tarde' })
      .closest('article')
    fireEvent.click(
      within(updatedRow as HTMLElement).getByRole('button', {
        name: 'Eliminar Presentación: The Hobbit · tarde',
      }),
    )
    fireEvent.click(
      within(updatedRow as HTMLElement).getByRole('button', {
        name: 'Confirmar',
      }),
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', {
          name: 'Presentación: The Hobbit · tarde',
        }),
      ).not.toBeInTheDocument(),
    )
    expect(
      communityEventApiMocks.deletePersistedCommunityEvent,
    ).toHaveBeenCalledWith(
      'community-crc-delorean',
      'event-presentation-hobbit',
    )
  })

  it('duplicates an event one week later without its registrations', async () => {
    authenticateAsManager()
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))
    fireEvent.click(screen.getAllByRole('link', { name: /Eventos/ }).at(-1)!)

    const eventRow = screen
      .getByRole('heading', { name: 'Presentación: The Hobbit' })
      .closest('article')
    fireEvent.click(
      within(eventRow as HTMLElement).getByRole('button', {
        name: 'Duplicar Presentación: The Hobbit',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Duplicar evento' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-08-15')
    expect(screen.getByLabelText('Título')).toHaveValue(
      'Presentación: The Hobbit',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Crear copia' }))

    expect(
      await screen.findByText('La copia ya aparece en la agenda.'),
    ).toBeVisible()
    expect(communityEventApiMocks.createCommunityEvent).toHaveBeenCalledWith(
      'community-crc-delorean',
      expect.objectContaining({
        startsAt: '2026-08-15T17:00:00+02:00',
        title: 'Presentación: The Hobbit',
      }),
    )
    const savedData = createLocalDemoRepository(window.localStorage).load()
    const copies = savedData.events.filter(
      ({ title }) => title === 'Presentación: The Hobbit',
    )
    expect(copies).toHaveLength(2)
    expect(copies.at(-1)).toMatchObject({
      startsAt: '2026-08-15T17:00:00+02:00',
      registrationSummary: { confirmed: 0, waitlisted: 0 },
    })
    expect(
      savedData.registrations.some(
        ({ eventId }) => eventId === copies.at(-1)?.id,
      ),
    ).toBe(false)
  })

  it('browses marketplace offers and the member wanted list', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Ofertas/ }))

    expect(
      screen.getByRole('heading', { name: 'Cartas disponibles' }),
    ).toBeInTheDocument()
    const marketplaceTable = screen.getByRole('table', {
      name: 'Ofertas de cartas disponibles',
    })
    expect(
      within(marketplaceTable).queryByRole('columnheader', {
        name: 'Miembro',
      }),
    ).not.toBeInTheDocument()
    expect(
      within(marketplaceTable).getAllByRole('row', { name: /Sol Ring/ }),
    ).toHaveLength(3)
    expect(
      within(marketplaceTable).getAllByText('Diego Sánchez'),
    ).not.toHaveLength(0)
    const hideOwnListings = screen.getByRole('checkbox', {
      name: 'Ocultar mis cartas',
    })
    expect(hideOwnListings).toBeChecked()
    expect(screen.getByText('1–20 de 149')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('21–40 de 149')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByText('1–20 de 149')).toBeInTheDocument()

    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Buscar una carta o miembro',
      }),
      { target: { value: 'Álex Romero' } },
    )
    expect(screen.getByText('0 resultados')).toBeInTheDocument()
    fireEvent.click(hideOwnListings)
    expect(hideOwnListings).not.toBeChecked()
    expect(screen.getByText('10 resultados')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /Ver cartas de Álex Romero/ }),
    ).not.toHaveLength(0)
    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Buscar una carta o miembro',
      }),
      { target: { value: '' } },
    )

    fireEvent.click(
      within(
        screen.getByRole('table', {
          name: 'Ofertas de cartas disponibles',
        }),
      ).getAllByRole('button', {
        name: 'Ver cartas de Marta Soler',
      })[0],
    )
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(
      screen.getByRole('heading', { name: 'Marta Soler' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/cartas publicadas en Garroveta/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a las cartas' }))
    expect(
      screen.getByRole('heading', { name: 'Cartas disponibles' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ofertas/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(window.location.hash).toBe('#cartas?view=market')

    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Buscar una carta o miembro',
      }),
      { target: { value: 'Sheoldred' } },
    )

    expect(
      screen.getByRole('row', { name: /Sheoldred, the Apocalypse/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Sol Ring/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))

    expect(
      screen.getByRole('heading', { name: 'Cartas buscadas' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Sol Ring' })).toHaveLength(3)
    expect(
      screen.getAllByRole('heading', { name: 'The One Ring' }),
    ).toHaveLength(2)

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ampliar Sol Ring' })[0],
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reserves a marketplace quantity from the compact offer sheet', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Ofertas/ }))

    const marketplaceTable = screen.getByRole('table', {
      name: 'Ofertas de cartas disponibles',
    })
    fireEvent.click(
      within(marketplaceTable).getByRole('row', {
        name: 'Abrir oferta de Sol Ring de Marta Soler',
      }),
    )

    const offerDialog = screen.getByRole('dialog', { name: 'Sol Ring' })
    expect(
      within(offerDialog).getByText('Ver las cartas de Marta Soler'),
    ).toBeInTheDocument()
    fireEvent.change(
      within(offerDialog).getByLabelText('Cantidad a reservar'),
      { target: { value: '2' } },
    )
    fireEvent.click(
      within(offerDialog).getByRole('button', {
        name: 'Reservar 2 cartas',
      }),
    )

    expect(
      within(offerDialog).getByText('2 cartas reservadas para ti'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring-marta'),
    ).toMatchObject({
      status: 'reserved',
      reservedByMemberId: demoData.currentMemberId,
      reservedQuantity: 2,
    })

    expect(
      within(offerDialog).getByLabelText('Cantidad a cancelar'),
    ).toHaveValue('1')
    fireEvent.click(
      within(offerDialog).getByRole('button', { name: 'Cancelar 1 carta' }),
    )
    expect(
      within(offerDialog).getByText('1 carta reservada para ti'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring-marta'),
    ).toMatchObject({ status: 'reserved', reservedQuantity: 1 })

    fireEvent.click(
      within(offerDialog).getByRole('button', { name: 'Cancelar 1 carta' }),
    )
    expect(
      within(offerDialog).getByRole('button', { name: 'Reservar 2 cartas' }),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring-marta')
        ?.reservedQuantity,
    ).toBeUndefined()

    fireEvent.click(
      within(offerDialog).getByRole('button', { name: 'Cerrar oferta' }),
    )
    fireEvent.click(
      within(marketplaceTable).getByRole('row', {
        name: 'Abrir oferta de Sol Ring de Diego Sánchez',
      }),
    )
    const singleCardDialog = screen.getByRole('dialog', { name: 'Sol Ring' })
    expect(
      within(singleCardDialog).getByLabelText('Cantidad a reservar'),
    ).toBeDisabled()
    expect(
      within(singleCardDialog).getByLabelText('Cantidad a reservar'),
    ).toHaveValue('1')
    expect(
      within(singleCardDialog).getByRole('button', {
        name: 'Reservar carta',
      }),
    ).toBeInTheDocument()
  })

  it('publishes a card offer in the local marketplace', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Añadir carta' }))
    fireEvent.change(screen.getByLabelText('Buscar una carta'), {
      target: { value: 'Esper Sentinel' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Esper Sentinel/ }))
    fireEvent.change(screen.getByLabelText('Cantidad'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar oferta' }))

    expect(
      screen.getByText('La carta se ha añadido a tus listas.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('row', { name: /Esper Sentinel/ }),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Ocultar mis cartas' }),
    )
    const publishedListing = screen.getByRole('row', {
      name: /Esper Sentinel/,
    })
    expect(
      within(publishedListing).getByText('Álex Romero'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().listings.at(-1),
    ).toMatchObject({
      cardId: 'card-esper-sentinel',
      memberId: demoData.currentMemberId,
      quantity: 2,
    })
  })

  it('switches marketplace offers to a readable Scryfall image gallery', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Ofertas/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Imágenes' }))

    expect(screen.getByLabelText('Galería de ofertas')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(12)
    expect(screen.getAllByRole('img')[0].getAttribute('src')).toContain(
      'https://cards.scryfall.io/large/',
    )
    expect(screen.getByText('1–12 de 149')).toBeInTheDocument()

    const martaGalleryCard = screen
      .getByRole('button', {
        name: 'Reservar Sol Ring de Marta Soler',
      })
      .closest('article')!
    expect(within(martaGalleryCard).getByText('Cantidad')).toBeInTheDocument()
    expect(within(martaGalleryCard).getByText('2')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Reservar Sol Ring de Marta Soler',
      }),
    )
    expect(screen.getByRole('dialog', { name: 'Sol Ring' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar oferta' }))

    fireEvent.click(screen.getByRole('button', { name: '4 por fila' }))
    expect(screen.getAllByRole('img')).toHaveLength(20)
    expect(screen.getByText('1–20 de 149')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Cantidad 2').length).toBeGreaterThan(0)

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ampliar Sol Ring' })[0],
    )
    const imageDialog = screen.getByRole('dialog')
    expect(imageDialog).toBeInTheDocument()
    expect(
      within(imageDialog).getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tabla' }))
    expect(
      screen.getByRole('table', { name: 'Ofertas de cartas disponibles' }),
    ).toBeInTheDocument()
    expect(screen.getByText('1–20 de 149')).toBeInTheDocument()

    const firstTableRow = screen.getAllByRole('row')[1]
    fireEvent.click(
      within(firstTableRow).getByRole('button', { name: 'Ampliar Sol Ring' }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('imports a wanted-card list and reports unknown names', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [], not_found: [{}] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }))
    fireEvent.change(screen.getByLabelText('Lista de cartas'), {
      target: {
        value: '2x Rhystic Study\nEsper Sentinel\nCarta desconocida',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analizar lista' }))
    const rhysticQuantity = await screen.findByLabelText(
      'Cantidad buscada de Rhystic Study',
    )
    fireEvent.change(rhysticQuantity, { target: { value: '4' } })
    fireEvent.change(
      await screen.findByLabelText('Idioma para Rhystic Study'),
      { target: { value: 'en' } },
    )
    fireEvent.change(screen.getByLabelText('Acabado para Rhystic Study'), {
      target: { value: 'foil' },
    })
    fireEvent.click(
      await screen.findByRole('button', { name: 'Importar búsquedas' }),
    )

    expect(
      screen.getByText(
        '2 búsquedas importadas. No reconocidas: Carta desconocida.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Rhystic Study' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Esper Sentinel' }),
    ).toBeInTheDocument()
    const storedWantedCards = createLocalDemoRepository(
      window.localStorage,
    ).load().wantedCards
    expect(
      storedWantedCards.filter(
        ({ memberId }) => memberId === demoData.currentMemberId,
      ),
    ).toHaveLength(9)
    expect(
      storedWantedCards.find(
        ({ memberId, cardId }) =>
          memberId === demoData.currentMemberId &&
          cardId === 'card-rhystic-study',
      ),
    ).toMatchObject({
      quantity: 4,
      acceptedLanguages: ['en'],
      acceptedFinishes: ['foil'],
    })
  })

  it('imports an editable list of marketplace offers', async () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ofertas' }))
    fireEvent.change(screen.getByLabelText('Lista de cartas'), {
      target: { value: '2 Sol Ring (CMM) 410\nRhystic Study' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analizar lista' }))

    const quantityInput = await screen.findByLabelText('Cantidad de Sol Ring')
    fireEvent.change(quantityInput, { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Idioma de Sol Ring'), {
      target: { value: 'fr' },
    })
    fireEvent.change(screen.getByLabelText('Estado de Sol Ring'), {
      target: { value: 'good' },
    })
    fireEvent.change(screen.getByLabelText('Acabado de Sol Ring'), {
      target: { value: 'foil' },
    })
    fireEvent.change(screen.getByLabelText('Precio de Sol Ring'), {
      target: { value: '4.75' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar ofertas' }))

    expect(screen.getByText('2 ofertas publicadas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mis ofertas/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const importedSolRing = screen
      .getAllByRole('heading', { name: 'Sol Ring' })
      .at(-1)
      ?.closest('article')
    expect(importedSolRing).toBeTruthy()
    expect(
      within(importedSolRing as HTMLElement).getByText('3 unidades · Francés'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(
          ({ memberId, language, condition, finish }) =>
            memberId === demoData.currentMemberId &&
            language === 'fr' &&
            condition === 'good' &&
            finish === 'foil',
        ),
    ).toMatchObject({ quantity: 3, priceEur: 4.75 })
  })

  it('creates and displays automatic matches after an import', async () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)

    expect(
      screen.getByRole('heading', { name: 'Tus coincidencias' }),
    ).toBeInTheDocument()
    expect(screen.getByText('6 ofertas compatibles')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()

    const solRingGroup = screen
      .getByRole('heading', { name: 'Sol Ring' })
      .closest('article')
    expect(
      within(solRingGroup as HTMLElement).getByText('Diego Sánchez'),
    ).toBeInTheDocument()
    expect(
      within(solRingGroup as HTMLElement).getByText('Marta Soler'),
    ).toBeInTheDocument()
    expect(
      within(solRingGroup as HTMLElement).getByText('Sergio Gil'),
    ).toBeInTheDocument()

    fireEvent.click(
      within(solRingGroup as HTMLElement).getByRole('button', {
        name: 'Ampliar Sol Ring',
      }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))

    fireEvent.click(screen.getByRole('button', { name: 'Por miembro' }))
    const diegoGroup = screen
      .getByRole('heading', { name: 'Diego Sánchez' })
      .closest('article')
    expect(
      within(diegoGroup as HTMLElement).getByRole('button', {
        name: 'Ver coincidencia de Sol Ring con Diego Sánchez',
      }),
    ).toBeInTheDocument()
    expect(
      within(diegoGroup as HTMLElement).getByRole('button', {
        name: 'Ver coincidencia de The One Ring con Diego Sánchez',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Por carta' }))

    fireEvent.click(screen.getByRole('button', { name: 'Importar lista' }))
    fireEvent.change(screen.getByLabelText('Lista de cartas'), {
      target: { value: 'Rhystic Study' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Analizar lista' }))
    fireEvent.change(
      await screen.findByLabelText('Idioma para Rhystic Study'),
      { target: { value: 'en' } },
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Importar búsquedas' }),
    )
    fireEvent.click(screen.getByRole('button', { name: /Coincidencias/ }))

    await waitFor(() =>
      expect(screen.getByText('7 ofertas compatibles')).toBeInTheDocument(),
    )
    const newMatch = screen
      .getByRole('heading', { name: 'Rhystic Study' })
      .closest('article')
    expect(
      within(newMatch as HTMLElement).getByText('Marta Soler'),
    ).toBeInTheDocument()
    expect(
      within(newMatch as HTMLElement).getByText(/Nueva/),
    ).toBeInTheDocument()
  })

  it('opens a match and reveals the seller contact authorized for it', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    const solRingMatch = screen
      .getByRole('heading', { name: 'Sol Ring' })
      .closest('article')
    fireEvent.click(
      within(solRingMatch as HTMLElement).getByRole('button', {
        name: 'Ver coincidencia de Sol Ring con Diego Sánchez',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Diego Sánchez' }),
    ).toBeInTheDocument()
    expect(screen.getByText('diego-modern')).toBeInTheDocument()
    expect(
      screen.getByText(/solo se muestran porque existe una coincidencia/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reservar carta' }))
    const matchReservationDialog = screen.getByRole('dialog', {
      name: 'Sol Ring',
    })
    fireEvent.click(
      within(matchReservationDialog).getByRole('button', {
        name: 'Reservar carta',
      }),
    )
    fireEvent.click(
      within(matchReservationDialog).getByRole('button', {
        name: 'Cerrar oferta',
      }),
    )
    expect(
      screen.getByRole('button', { name: 'Cancelar reserva' }),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring'),
    ).toMatchObject({
      status: 'reserved',
      reservedByMemberId: demoData.currentMemberId,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    const matchCancellationDialog = screen.getByRole('dialog', {
      name: 'Sol Ring',
    })
    expect(
      within(matchCancellationDialog).getByLabelText('Cantidad a cancelar'),
    ).toBeDisabled()
    fireEvent.click(
      within(matchCancellationDialog).getByRole('button', {
        name: 'Cancelar 1 carta',
      }),
    )
    fireEvent.click(
      within(matchCancellationDialog).getByRole('button', {
        name: 'Cerrar oferta',
      }),
    )
    expect(
      screen.getByRole('button', { name: 'Reservar carta' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar Sol Ring' }))
    const imageDialog = screen.getByRole('dialog')
    expect(
      within(imageDialog).getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()
    expect(within(imageDialog).getByRole('img')).toHaveAttribute(
      'src',
      expect.stringContaining('cards.scryfall.io'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar imagen' }))
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .cardMatches.find(({ id }) => id === 'match-alex-sol-ring')?.status,
    ).toBe('seen')

    fireEvent.click(
      screen.getByRole('button', { name: 'Volver a las coincidencias' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Tus coincidencias' }),
    ).toBeInTheDocument()
  })

  it('records a completed operation from its match detail', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    const solRingMatch = screen
      .getByRole('heading', { name: 'Sol Ring' })
      .closest('article')
    fireEvent.click(
      within(solRingMatch as HTMLElement).getByRole('button', {
        name: 'Ver coincidencia de Sol Ring con Diego Sánchez',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Marcar operación realizada',
      }),
    )

    expect(screen.getByText('Operación registrada')).toBeInTheDocument()
    expect(
      screen.getByText('Operación realizada con Diego Sánchez.'),
    ).toBeInTheDocument()

    const storedData = createLocalDemoRepository(window.localStorage).load()
    expect(storedData.cardDeals).toEqual([
      expect.objectContaining({
        matchId: 'match-alex-sol-ring',
        type: 'sale',
      }),
    ])
    expect(
      storedData.cardMatches.find(({ id }) => id === 'match-alex-sol-ring')
        ?.status,
    ).toBe('completed')
  })

  it('pauses searches and manages the lifecycle of an owned offer', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))

    const wantedSolRing = screen
      .getAllByRole('heading', { name: 'Sol Ring' })[0]
      .closest('article')
    fireEvent.click(
      within(wantedSolRing as HTMLElement).getByRole('button', {
        name: 'Retirar búsqueda de Sol Ring',
      }),
    )
    expect(
      within(wantedSolRing as HTMLElement).getByText('Retirada'),
    ).toBeInTheDocument()
    expect(screen.getByText('La búsqueda se ha retirado.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Añadir carta' }))
    fireEvent.change(screen.getByLabelText('Buscar una carta'), {
      target: { value: 'Esper Sentinel' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Esper Sentinel/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar oferta' }))
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Mis ofertas/ }))

    const ownedListing = screen
      .getByRole('heading', { name: 'Esper Sentinel' })
      .closest('article')
    fireEvent.click(
      within(ownedListing as HTMLElement).getByRole('button', {
        name: 'Retirar oferta de Esper Sentinel',
      }),
    )
    expect(
      within(ownedListing as HTMLElement).getByText('Retirada'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage).load().listings.at(-1)
        ?.status,
    ).toBe('completed')

    fireEvent.click(
      within(ownedListing as HTMLElement).getByRole('button', {
        name: 'Volver a publicar Esper Sentinel',
      }),
    )
    expect(
      within(ownedListing as HTMLElement).getByText('Publicada'),
    ).toBeInTheDocument()
  })

  it('edits wanted cards and offers after publication', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))

    const wantedSolRing = screen
      .getAllByRole('heading', { name: 'Sol Ring' })[0]
      .closest('article') as HTMLElement
    fireEvent.click(wantedSolRing.querySelector('summary')!)
    fireEvent.change(
      within(wantedSolRing).getByLabelText(
        'Editar cantidad buscada de Sol Ring',
      ),
      { target: { value: '4' } },
    )
    fireEvent.change(
      within(wantedSolRing).getByLabelText('Editar idioma de Sol Ring'),
      { target: { value: 'fr' } },
    )
    fireEvent.change(
      within(wantedSolRing).getByLabelText('Editar acabado de Sol Ring'),
      { target: { value: 'foil' } },
    )
    fireEvent.click(
      within(wantedSolRing).getByRole('button', {
        name: 'Guardar cambios',
      }),
    )

    expect(
      within(wantedSolRing).getByText('4 buscadas · Francés · Foil'),
    ).toBeVisible()
    expect(screen.getByText('La búsqueda se ha actualizado.')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Añadir carta' }))
    fireEvent.change(screen.getByLabelText('Buscar una carta'), {
      target: { value: 'Esper Sentinel' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Esper Sentinel/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar oferta' }))
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Mis ofertas/ }))

    const ownedListing = screen
      .getByRole('heading', { name: 'Esper Sentinel' })
      .closest('article') as HTMLElement
    fireEvent.click(ownedListing.querySelector('summary')!)
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar cantidad de Esper Sentinel'),
      { target: { value: '3' } },
    )
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar idioma de Esper Sentinel'),
      { target: { value: 'fr' } },
    )
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar estado de Esper Sentinel'),
      { target: { value: 'good' } },
    )
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar acabado de Esper Sentinel'),
      { target: { value: 'foil' } },
    )
    fireEvent.change(
      within(ownedListing).getByLabelText('Editar precio de Esper Sentinel'),
      { target: { value: '4.75' } },
    )
    fireEvent.click(
      within(ownedListing).getByRole('button', {
        name: 'Guardar cambios',
      }),
    )

    expect(within(ownedListing).getByText('3 unidades · Francés')).toBeVisible()
    expect(screen.getByText('La oferta se ha actualizado.')).toBeVisible()

    const storedData = createLocalDemoRepository(window.localStorage).load()
    expect(
      storedData.wantedCards.find(({ id }) => id === 'wanted-alex-sol-ring'),
    ).toMatchObject({
      quantity: 4,
      acceptedLanguages: ['fr'],
      acceptedFinishes: ['foil'],
    })
    expect(storedData.listings.at(-1)).toMatchObject({
      quantity: 3,
      language: 'fr',
      condition: 'good',
      finish: 'foil',
      priceEur: 4.75,
    })
  })

  it('creates, renames and filters private card lists', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Nueva' }))
    fireEvent.change(screen.getByLabelText('Nombre de la lista'), {
      target: { value: 'Modern 2026' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('button', { name: 'Modern 2026' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Lista «Modern 2026» creada.')).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .cardLists.some(({ name }) => name === 'Modern 2026'),
    ).toBe(true)

    fireEvent.click(
      screen.getByRole('button', { name: 'Renombrar Modern 2026' }),
    )
    fireEvent.change(screen.getByLabelText('Nombre de la lista'), {
      target: { value: 'Modern competitivo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(
      screen.getByRole('button', { name: 'Modern competitivo' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pauper' }))
    expect(
      screen.getAllByRole('heading', { name: 'Cyclonic Rift' }),
    ).toHaveLength(2)
    expect(
      screen.queryByRole('heading', { name: 'Sol Ring' }),
    ).not.toBeInTheDocument()
  })

  it('opens a shareable member catalogue with filters and reservations', () => {
    window.location.hash =
      '#cartas?member=member-marta&set=2X2&lang=es&condition=mint'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Marta Soler' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Edición')).toHaveValue('2X2')
    expect(screen.getByLabelText('Idioma de la página compartida')).toHaveValue(
      'es',
    )
    expect(screen.getByLabelText('Estado de la página compartida')).toHaveValue(
      'mint',
    )

    fireEvent.change(screen.getByLabelText('Edición'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Idioma de la página compartida'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Estado de la página compartida'), {
      target: { value: '' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Imágenes' }))
    expect(
      screen.getByLabelText('Galería de cartas de Marta Soler'),
    ).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('button', { name: /^Reservar .+ de Marta Soler$/ })[0]
        .querySelector('svg'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tabla' }))

    const reservedCard = screen.getByRole('row', {
      name: 'Abrir oferta de Sol Ring de Marta Soler',
    })
    expect(
      screen.getByRole('columnheader', { name: 'Cant.' }),
    ).toBeInTheDocument()
    expect(
      within(reservedCard as HTMLElement).getByText('2'),
    ).toBeInTheDocument()
    expect(
      within(reservedCard as HTMLElement).getByText('2.50 €'),
    ).toBeInTheDocument()
    expect(
      within(reservedCard as HTMLElement).getByText('Inglés'),
    ).toBeInTheDocument()
    expect(
      within(reservedCard as HTMLElement).getByText('Excellent'),
    ).toBeInTheDocument()
    fireEvent.click(reservedCard)

    const memberOfferDialog = screen.getByRole('dialog', { name: 'Sol Ring' })
    expect(
      within(memberOfferDialog).getByText('Disponibles'),
    ).toBeInTheDocument()
    fireEvent.change(
      within(memberOfferDialog).getByLabelText('Cantidad a reservar'),
      { target: { value: '2' } },
    )
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', {
        name: 'Reservar 2 cartas',
      }),
    )

    expect(
      within(memberOfferDialog).getByText('2 cartas reservadas para ti'),
    ).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(
          ({ reservedByMemberId }) =>
            reservedByMemberId === demoData.currentMemberId,
        ),
    ).toMatchObject({ status: 'reserved', reservedQuantity: 2 })

    fireEvent.change(
      within(memberOfferDialog).getByLabelText('Cantidad a cancelar'),
      { target: { value: '2' } },
    )
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', {
        name: 'Cancelar 2 cartas',
      }),
    )
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', { name: 'Cerrar oferta' }),
    )
    expect(reservedCard).toBeInTheDocument()
    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-sol-ring-marta'),
    ).toMatchObject({ status: 'available' })
    expect(
      screen.getByText(/La reserva de .+ se ha cancelado/),
    ).toBeInTheDocument()
  })

  it('lists cards reserved by the current member', () => {
    window.location.hash = '#cartas?member=member-marta'
    render(<App />)

    const reservedCard = screen.getByRole('row', {
      name: 'Abrir oferta de Sol Ring de Marta Soler',
    })
    const cardName = reservedCard?.querySelector('strong')?.textContent
    fireEvent.click(reservedCard)
    const memberOfferDialog = screen.getByRole('dialog', {
      name: cardName ?? '',
    })
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', {
        name: 'Reservar carta',
      }),
    )
    fireEvent.click(
      within(memberOfferDialog).getByRole('button', { name: 'Cerrar oferta' }),
    )
    fireEvent.click(reservedCard)
    const reopenedMemberOfferDialog = screen.getByRole('dialog', {
      name: cardName ?? '',
    })
    expect(
      within(reopenedMemberOfferDialog).getByLabelText('Cantidad a cancelar'),
    ).toBeInTheDocument()
    fireEvent.click(
      within(reopenedMemberOfferDialog).getByRole('button', {
        name: 'Cerrar oferta',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Volver a las cartas' }))
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Reservadas/ }))

    expect(
      screen.getByRole('heading', { name: 'Cartas reservadas' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { name: cardName ?? '' }).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(/De Marta Soler/)).toBeInTheDocument()
    expect(screen.getByText('Para ti')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    const cancellationDialog = screen.getByRole('dialog', {
      name: cardName ?? '',
    })
    expect(
      within(cancellationDialog).getByLabelText('Cantidad a cancelar'),
    ).toBeDisabled()
    fireEvent.click(
      within(cancellationDialog).getByRole('button', {
        name: 'Cancelar 1 carta',
      }),
    )
    fireEvent.click(
      within(cancellationDialog).getByRole('button', {
        name: 'Cerrar oferta',
      }),
    )
    expect(
      screen.getByText('No tienes ninguna carta reservada pendiente.'),
    ).toBeInTheDocument()
    expect(screen.getByText('La reserva se ha cancelado.')).toBeInTheDocument()
  })

  it('lets the seller partially release a reserved quantity', () => {
    const repository = createLocalDemoRepository(window.localStorage)
    repository.save(
      reserveMarketplaceListing(
        structuredClone(demoData),
        'listing-marketplace-demo-14',
        'member-marta',
        undefined,
        2,
      ),
    )
    render(<App />)

    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: /Reservadas/ }))

    const releaseButton = screen.getByRole('button', {
      name: 'Liberar carta',
    })
    expect(
      within(releaseButton.closest('article') as HTMLElement).getByText(
        'Tu oferta',
      ),
    ).toBeInTheDocument()
    fireEvent.click(releaseButton)

    const releaseDialog = screen.getByRole('dialog')
    expect(
      within(releaseDialog).getByLabelText('Cantidad a liberar'),
    ).toHaveValue('1')
    expect(
      within(releaseDialog).getByLabelText('Cantidad a liberar'),
    ).not.toBeDisabled()
    fireEvent.click(
      within(releaseDialog).getByRole('button', {
        name: 'Liberar 1 carta',
      }),
    )

    expect(
      createLocalDemoRepository(window.localStorage)
        .load()
        .listings.find(({ id }) => id === 'listing-marketplace-demo-14'),
    ).toMatchObject({ status: 'reserved', reservedQuantity: 1 })
  })

  it('filters wanted cards without a private list', () => {
    const repository = createLocalDemoRepository(window.localStorage)
    const modifiedData = structuredClone(demoData)
    modifiedData.wantedCards[0].cardListId = undefined
    repository.save(modifiedData)

    render(<App />)
    fireEvent.click(screen.getAllByRole('link', { name: /Cartas/ }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Mis listas/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Sin lista' }))

    expect(screen.getByRole('button', { name: 'Sin lista' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('heading', { name: 'Sol Ring' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'The One Ring' }),
    ).not.toBeInTheDocument()
  })

  it('does not let a player elevate their authenticated role', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))

    expect(
      screen.getByRole('heading', { name: 'CRC Delorean' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Inca')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(
      screen.getByText('Datos guardados en este navegador'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Gerente/ }))

    expect(screen.getByLabelText('Vista actual: Jugador')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Jugador/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }))

    expect(screen.getByLabelText('Vista actual: Jugador')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Jugador/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('restores the original local data from the profile', () => {
    const repository = createLocalDemoRepository(window.localStorage)
    const modifiedData = structuredClone(demoData)
    modifiedData.community.memberCount = 151
    repository.save(modifiedData)

    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    expect(screen.getByText('151')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }))

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(repository.load().community.memberCount).toBe(150)
  })
})
