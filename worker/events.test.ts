import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorizeApprovedManager,
  authorizeApprovedMember,
} from './authorization'
import { type AuthEnv } from './auth'
import { handleEventApiRequest, matchEventRoute } from './events'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  authorizeApprovedMember: vi.fn(),
}))

const collectionRoute = {
  communityId: 'community-crc-delorean',
  kind: 'collection' as const,
}
const eventRoute = {
  communityId: 'community-crc-delorean',
  eventId: 'event-standard',
  kind: 'event' as const,
}
const managerMembership = {
  communityId: 'community-crc-delorean',
  displayName: 'Tomás',
  id: 'member-manager',
  role: 'manager' as const,
  status: 'approved' as const,
  userId: 'user-manager',
}
const persistedEvent = {
  capacity: 16,
  community_id: 'community-crc-delorean',
  competition_event_kind_id: 'event-kind-fnm',
  counts_for_community_ranking: 1,
  created_by_member_id: 'member-manager',
  description: 'Tres rondas de Standard.',
  ends_at: '2026-09-04T21:00:00.000Z',
  format_id: 'format-standard',
  game_id: 'game-mtg',
  id: 'event-standard',
  image_uri: null,
  listed_in_agenda: 1,
  registration_enabled: 1,
  starts_at: '2026-09-04T16:00:00.000Z',
  status: 'scheduled',
  tag_ids: '["tag-standard"]',
  title: 'FNM Standard',
  type: 'tournament',
  waitlist_enabled: 1,
}
const eventInput = {
  capacity: 16,
  competitionEventKindId: 'event-kind-fnm',
  countsForCommunityRanking: true,
  description: 'Tres rondas de Standard.',
  endsAt: '2026-09-04T21:00:00.000Z',
  formatId: 'format-standard',
  gameId: 'game-mtg',
  listedInAgenda: true,
  registrationEnabled: true,
  startsAt: '2026-09-04T16:00:00.000Z',
  tagIds: ['tag-standard'],
  title: 'FNM Standard',
  type: 'tournament',
  waitlistEnabled: true,
}

function authorization(role: 'manager' | 'player' = 'manager') {
  return {
    authorized: true as const,
    value: {
      membership: { ...managerMembership, role },
      user: {
        email: `${role}@example.com`,
        id: `user-${role}`,
        name: role,
      },
    },
  }
}

const managerAuthorization = {
  authorized: true as const,
  value: {
    membership: managerMembership,
    user: {
      email: 'manager@example.com',
      id: 'user-manager',
      name: 'manager',
    },
  },
}

function createContext({
  body,
  firstResults = [],
  method = 'GET',
  rows = [],
}: {
  body?: unknown
  firstResults?: unknown[]
  method?: string
  rows?: unknown[]
} = {}) {
  const statements: Array<{
    all: ReturnType<typeof vi.fn>
    bind: ReturnType<typeof vi.fn>
    first: ReturnType<typeof vi.fn>
  }> = []
  const pendingFirstResults = [...firstResults]
  const prepare = vi.fn((query: string) => {
    void query
    const statement = {
      all: vi.fn().mockResolvedValue({ results: rows }),
      bind: vi.fn(),
      first: vi.fn().mockResolvedValue(pendingFirstResults.shift() ?? null),
    }
    statement.bind.mockReturnValue(statement)
    statements.push(statement)
    return statement
  })
  const init: RequestInit = { method }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return {
    context: {
      context: {} as ExecutionContext,
      env: { DB: { prepare } as unknown as D1Database } as AuthEnv,
      request: new Request(
        'https://api.garroveta.es/api/communities/community-crc-delorean/events',
        init,
      ),
    },
    prepare,
    statements,
  }
}

describe('Community event routes', () => {
  it('matches only collection and item routes with safe identifiers', () => {
    expect(
      matchEventRoute('/api/communities/community-crc-delorean/events'),
    ).toEqual(collectionRoute)
    expect(
      matchEventRoute(
        '/api/communities/community-crc-delorean/events/event-standard',
      ),
    ).toEqual(eventRoute)
    expect(
      matchEventRoute('/api/communities/community%2Fother/events'),
    ).toBeNull()
  })
})

describe('Community event API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedMember).mockResolvedValue(authorization())
    vi.mocked(authorizeApprovedManager).mockResolvedValue(managerAuthorization)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('lists all events for a manager and maps stored values', async () => {
    const { context, statements } = createContext({ rows: [persistedEvent] })

    const response = await handleEventApiRequest(context, collectionRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      events: [
        expect.objectContaining({
          id: 'event-standard',
          registrationEnabled: true,
          registrationSummary: { confirmed: 0, waitlisted: 0 },
          tagIds: ['tag-standard'],
        }),
      ],
    })
    expect(statements[0]?.bind).toHaveBeenCalledWith('community-crc-delorean')
  })

  it('restricts a player list query to visible agenda events', async () => {
    vi.mocked(authorizeApprovedMember).mockResolvedValue(
      authorization('player'),
    )
    const { context, prepare } = createContext()

    await handleEventApiRequest(context, collectionRoute)

    expect(prepare.mock.calls[0]?.[0]).toContain('listed_in_agenda = 1')
  })

  it('creates an event for an approved manager', async () => {
    const { context, statements } = createContext({
      body: eventInput,
      firstResults: [persistedEvent],
      method: 'POST',
    })

    const response = await handleEventApiRequest(context, collectionRoute)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      event: { id: 'event-standard', title: 'FNM Standard' },
    })
    expect(statements[0]?.bind).toHaveBeenCalledWith(
      expect.any(String),
      'community-crc-delorean',
      'game-mtg',
      'format-standard',
      'event-kind-fnm',
      'tournament',
      'FNM Standard',
      'Tres rondas de Standard.',
      null,
      '2026-09-04T16:00:00.000Z',
      '2026-09-04T21:00:00.000Z',
      1,
      1,
      1,
      1,
      16,
      '["tag-standard"]',
      'member-manager',
      expect.any(String),
      expect.any(String),
    )
  })

  it('updates and deletes a manager event', async () => {
    const update = createContext({
      body: { ...eventInput, title: 'FNM Standard actualizado' },
      firstResults: [{ ...persistedEvent, title: 'FNM Standard actualizado' }],
      method: 'PATCH',
    })
    const updated = await handleEventApiRequest(update.context, eventRoute)
    expect(updated.status).toBe(200)
    await expect(updated.json()).resolves.toMatchObject({
      event: { title: 'FNM Standard actualizado' },
    })

    const deletion = createContext({
      firstResults: [{ id: 'event-standard' }],
      method: 'DELETE',
    })
    const deleted = await handleEventApiRequest(deletion.context, eventRoute)
    await expect(deleted.json()).resolves.toEqual({
      deletedEventId: 'event-standard',
    })
  })

  it('rejects invalid event input before accessing D1', async () => {
    const { context, prepare } = createContext({
      body: { ...eventInput, endsAt: eventInput.startsAt },
      method: 'POST',
    })

    const response = await handleEventApiRequest(context, collectionRoute)

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'event_invalid' },
    })
  })

  it('requires manager access before an event write', async () => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { error: { code: 'manager_access_required' } },
        { status: 403 },
      ),
    })
    const { context, prepare } = createContext({
      body: eventInput,
      method: 'POST',
    })

    const response = await handleEventApiRequest(context, collectionRoute)

    expect(response.status).toBe(403)
    expect(prepare).not.toHaveBeenCalled()
  })
})
