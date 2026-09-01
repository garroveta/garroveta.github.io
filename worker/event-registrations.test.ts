import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorizeApprovedManager,
  authorizeApprovedMember,
} from './authorization'
import { type AuthEnv } from './auth'
import {
  handleEventRegistrationApiRequest,
  matchEventRegistrationRoute,
} from './event-registrations'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  authorizeApprovedMember: vi.fn(),
}))

const communityId = 'community-crc-delorean'
const eventId = 'event-draft'
const membership = {
  communityId,
  displayName: 'Aina Mir',
  id: 'member-aina',
  role: 'player' as const,
  status: 'approved' as const,
  userId: 'user-aina',
}
const collectionRoute = {
  communityId,
  eventId,
  kind: 'collection' as const,
}
const registrationEvent = {
  capacity: 4,
  game_id: 'game-mtg',
  id: eventId,
  registration_enabled: 1,
  status: 'scheduled',
  waitlist_enabled: 1,
}
const persistedRegistration = {
  event_id: eventId,
  id: 'registration-aina',
  member_id: membership.id,
  registered_at: '2026-09-01T10:00:00.000Z',
  status: 'confirmed',
}

function authorized(role: 'manager' | 'player' = 'player') {
  return {
    authorized: true as const,
    value: {
      membership: { ...membership, role },
      user: {
        email: `${role}@example.com`,
        id: `user-${role}`,
        name: role,
      },
    },
  }
}

function createContext({
  allResults = [],
  firstResults = [],
  method = 'GET',
}: {
  allResults?: unknown[][]
  firstResults?: unknown[]
  method?: string
} = {}) {
  const pendingAllResults = [...allResults]
  const pendingFirstResults = [...firstResults]
  const statements: Array<{
    all: ReturnType<typeof vi.fn>
    bind: ReturnType<typeof vi.fn>
    first: ReturnType<typeof vi.fn>
  }> = []
  const prepare = vi.fn(() => {
    const statement = {
      all: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ results: pendingAllResults.shift() ?? [] }),
        ),
      bind: vi.fn(),
      first: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(pendingFirstResults.shift() ?? null),
        ),
    }
    statement.bind.mockReturnValue(statement)
    statements.push(statement)
    return statement
  })

  return {
    context: {
      context: {} as ExecutionContext,
      env: { DB: { prepare } as unknown as D1Database } as AuthEnv,
      request: new Request(
        `https://api.garroveta.es/api/communities/${communityId}/events/${eventId}/registrations`,
        { method },
      ),
    },
    prepare,
    statements,
  }
}

describe('Event registration routes', () => {
  it('matches collection, current-member and managed-member routes', () => {
    expect(
      matchEventRegistrationRoute(
        `/api/communities/${communityId}/events/${eventId}/registrations`,
      ),
    ).toEqual(collectionRoute)
    expect(
      matchEventRegistrationRoute(
        `/api/communities/${communityId}/events/${eventId}/registrations/me`,
      ),
    ).toEqual({ communityId, eventId, kind: 'self' })
    expect(
      matchEventRegistrationRoute(
        `/api/communities/${communityId}/events/${eventId}/registrations/member-aina`,
      ),
    ).toEqual({ communityId, eventId, kind: 'member', memberId: 'member-aina' })
  })
})

describe('Event registration API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedMember).mockResolvedValue(authorized())
    vi.mocked(authorizeApprovedManager).mockResolvedValue(
      authorized('manager') as never,
    )
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('registers the current approved member and returns the new summary', async () => {
    const { context, statements } = createContext({
      firstResults: [
        registrationEvent,
        persistedRegistration,
        { confirmed: 1, waitlisted: 0 },
      ],
      method: 'POST',
    })

    const response = await handleEventRegistrationApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      registration: {
        eventId,
        id: 'registration-aina',
        memberId: membership.id,
        registeredAt: '2026-09-01T10:00:00.000Z',
        status: 'confirmed',
      },
      registrationSummary: { confirmed: 1, waitlisted: 0 },
    })
    expect(statements[1]?.bind).toHaveBeenCalledWith(
      expect.any(String),
      membership.id,
      expect.any(String),
      expect.any(String),
      communityId,
      eventId,
    )
  })

  it('cancels the current member registration', async () => {
    const { context } = createContext({
      firstResults: [
        { id: 'registration-aina' },
        { confirmed: 3, waitlisted: 0 },
      ],
      method: 'DELETE',
    })

    const response = await handleEventRegistrationApiRequest(context, {
      communityId,
      eventId,
      kind: 'self',
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      cancelledMemberId: membership.id,
      registrationSummary: { confirmed: 3, waitlisted: 0 },
    })
  })

  it('lets a manager list participants without attendance data', async () => {
    const { context } = createContext({
      allResults: [
        [
          {
            ...persistedRegistration,
            display_name: 'Aina Mir',
            status: 'waitlisted',
          },
        ],
      ],
      firstResults: [registrationEvent],
    })

    const response = await handleEventRegistrationApiRequest(
      context,
      collectionRoute,
    )

    await expect(response.json()).resolves.toEqual({
      registrations: [
        expect.objectContaining({
          displayName: 'Aina Mir',
          initials: 'AM',
          status: 'waitlisted',
          waitlistPosition: 1,
        }),
      ],
    })
  })

  it('requires manager access to remove another member', async () => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { error: { code: 'manager_access_required' } },
        { status: 403 },
      ),
    })
    const { context, prepare } = createContext({ method: 'DELETE' })

    const response = await handleEventRegistrationApiRequest(context, {
      communityId,
      eventId,
      kind: 'member',
      memberId: 'member-other',
    })

    expect(response.status).toBe(403)
    expect(prepare).not.toHaveBeenCalled()
  })
})
