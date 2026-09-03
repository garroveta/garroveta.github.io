import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorizeApprovedManager,
  authorizeApprovedMember,
  type ManagerAuthorizationResult,
  type MemberAuthorizationResult,
} from './authorization'
import { type AuthEnv } from './auth'
import {
  handleEventStandingApiRequest,
  matchEventStandingRoute,
} from './event-standings'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  authorizeApprovedMember: vi.fn(),
}))

const collectionRoute = {
  communityId: 'community-crc-delorean',
  kind: 'collection' as const,
}
const standingRoute = {
  communityId: 'community-crc-delorean',
  eventId: 'event-fnm-pauper',
  kind: 'standing' as const,
}

const standingInput = {
  countsForCommunityRanking: true,
  entries: [
    {
      displayName: 'Aina Mir',
      draws: 0,
      eventPoints: 9,
      gameWinPercentage: 66.6,
      losses: 0,
      memberId: 'member-player',
      opponentGameWinPercentage: 50,
      opponentMatchWinPercentage: 55.5,
      rank: 1,
      wins: 3,
    },
  ],
  source: {
    externalEventId: '456',
    roundNumber: 3,
    storeId: '123',
  },
}

function memberAuthorization(): MemberAuthorizationResult {
  return {
    authorized: true,
    value: {
      membership: {
        communityId: 'community-crc-delorean',
        displayName: 'Aina Mir',
        id: 'member-player',
        role: 'player',
        status: 'approved',
        userId: 'user-player',
      },
      user: { email: 'player@example.com', id: 'user-player', name: 'Aina' },
    },
  }
}

function managerAuthorization(): ManagerAuthorizationResult {
  return {
    authorized: true,
    value: {
      membership: {
        communityId: 'community-crc-delorean',
        displayName: 'Tomás',
        id: 'member-manager',
        role: 'manager',
        status: 'approved',
        userId: 'user-manager',
      },
      user: { email: 'manager@example.com', id: 'user-manager', name: 'Tomás' },
    },
  }
}

function createContext({
  allResults,
  body,
  firstResults = [],
  method = 'GET',
}: {
  allResults?: unknown[][]
  body?: unknown
  firstResults?: unknown[]
  method?: string
} = {}) {
  const statements: Array<{
    all: ReturnType<typeof vi.fn>
    bind: ReturnType<typeof vi.fn>
    first: ReturnType<typeof vi.fn>
  }> = []
  const pendingFirstResults = [...firstResults]
  const pendingAllResults = allResults ? [...allResults] : [[]]
  const batch = vi.fn().mockResolvedValue([])
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
  const init: RequestInit = { method }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return {
    batch,
    context: {
      context: {} as ExecutionContext,
      env: { DB: { batch, prepare } as unknown as D1Database } as AuthEnv,
      request: new Request(
        'https://api.garroveta.es/api/communities/community-crc-delorean/event-standings',
        init,
      ),
    },
    prepare,
    statements,
  }
}

describe('Event standing routes', () => {
  it('matches collection and standing routes with safe identifiers', () => {
    expect(
      matchEventStandingRoute(
        '/api/communities/community-crc-delorean/event-standings',
      ),
    ).toEqual(collectionRoute)
    expect(
      matchEventStandingRoute(
        '/api/communities/community-crc-delorean/event-standings/event-fnm-pauper',
      ),
    ).toEqual(standingRoute)
    expect(
      matchEventStandingRoute(
        '/api/communities/community%2Fother/event-standings',
      ),
    ).toBeNull()
  })
})

describe('Event standing API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedMember).mockResolvedValue(memberAuthorization())
    vi.mocked(authorizeApprovedManager).mockResolvedValue(
      managerAuthorization(),
    )
  })

  it('requires authentication to list standings', async () => {
    vi.mocked(authorizeApprovedMember).mockResolvedValue({
      authorized: false,
      response: new Response(null, { status: 401 }),
    })
    const { context } = createContext()

    const response = await handleEventStandingApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(401)
  })

  it('lists event standings grouped by event for an approved member', async () => {
    const { context, statements } = createContext({
      allResults: [
        [
          {
            display_name: 'Aina Mir',
            draws: 0,
            entry_id: 'entry-1',
            event_id: 'event-fnm-pauper',
            event_points: 9,
            game_win_percentage: 66.6,
            imported_at: '2026-01-10T20:00:00.000Z',
            losses: 0,
            member_id: 'member-player',
            opponent_game_win_percentage: 50,
            opponent_match_win_percentage: 55.5,
            rank: 1,
            source_external_event_id: '456',
            source_round_number: 3,
            source_store_id: '123',
            standing_id: 'standing-1',
            wins: 3,
          },
        ],
      ],
    })

    const response = await handleEventStandingApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      standings: [
        {
          entries: [
            {
              displayName: 'Aina Mir',
              draws: 0,
              eventPoints: 9,
              gameWinPercentage: 66.6,
              losses: 0,
              memberId: 'member-player',
              opponentGameWinPercentage: 50,
              opponentMatchWinPercentage: 55.5,
              rank: 1,
              wins: 3,
            },
          ],
          eventId: 'event-fnm-pauper',
          id: 'standing-1',
          source: {
            externalEventId: '456',
            importedAt: '2026-01-10T20:00:00.000Z',
            kind: 'eventlink_html',
            roundNumber: 3,
            storeId: '123',
          },
        },
      ],
    })
    expect(statements[0]?.bind).toHaveBeenCalledWith('community-crc-delorean')
  })

  it('rejects a non-manager importing a standing', async () => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue({
      authorized: false,
      response: new Response(null, { status: 403 }),
    })
    const { context } = createContext({ body: standingInput, method: 'PUT' })

    const response = await handleEventStandingApiRequest(context, standingRoute)

    expect(response.status).toBe(403)
  })

  it('rejects importing results for an event without a Magic format', async () => {
    const { context } = createContext({
      body: standingInput,
      firstResults: [
        {
          ends_at: null,
          format_id: null,
          game_id: 'game-mtg',
          starts_at: '2026-01-10T20:00:00.000Z',
        },
      ],
      method: 'PUT',
    })

    const response = await handleEventStandingApiRequest(context, standingRoute)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'event_standing_missing_format' },
    })
  })

  it('rejects importing results into a closed ranking season', async () => {
    const { context } = createContext({
      body: standingInput,
      firstResults: [
        {
          ends_at: null,
          format_id: 'format-mtg-pauper',
          game_id: 'game-mtg',
          starts_at: '2026-01-10T20:00:00.000Z',
        },
        { id: 'format-mtg-pauper' },
        { id: 'season-2026', status: 'closed' },
      ],
      allResults: [[{ id: 'member-player' }]],
      method: 'PUT',
    })

    const response = await handleEventStandingApiRequest(context, standingRoute)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ranking_season_closed' },
    })
  })

  it('rejects a member not approved in the community', async () => {
    const { context } = createContext({
      body: standingInput,
      firstResults: [
        {
          ends_at: null,
          format_id: 'format-mtg-pauper',
          game_id: 'game-mtg',
          starts_at: '2026-01-10T20:00:00.000Z',
        },
        { id: 'format-mtg-pauper' },
      ],
      allResults: [[]],
      method: 'PUT',
    })

    const response = await handleEventStandingApiRequest(context, standingRoute)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'event_standing_invalid_member' },
    })
  })

  it('imports a standing, replaces its entries and marks the event completed', async () => {
    const { batch, context, statements } = createContext({
      body: standingInput,
      firstResults: [
        {
          ends_at: null,
          format_id: 'format-mtg-pauper',
          game_id: 'game-mtg',
          starts_at: '2026-01-10T20:00:00.000Z',
        },
        { id: 'format-mtg-pauper' },
        { id: 'season-2026', status: 'active' },
        { id: 'standing-1' },
      ],
      allResults: [[{ id: 'member-player' }]],
      method: 'PUT',
    })

    const response = await handleEventStandingApiRequest(context, standingRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      standing: {
        entries: standingInput.entries,
        eventId: 'event-fnm-pauper',
        id: 'standing-1',
        source: { externalEventId: '456', roundNumber: 3, storeId: '123' },
      },
    })
    expect(batch).toHaveBeenCalledOnce()
    expect(statements[4]?.bind).toHaveBeenCalledWith(
      expect.any(String),
      'community-crc-delorean',
      'event-fnm-pauper',
      'season-2026',
      '123',
      '456',
      3,
      expect.any(String),
      expect.any(String),
      expect.any(String),
    )
  })

  it('rejects a request body with duplicate linked members', async () => {
    const { context } = createContext({
      body: {
        ...standingInput,
        entries: [
          standingInput.entries[0],
          { ...standingInput.entries[0], rank: 2 },
        ],
      },
      firstResults: [
        {
          ends_at: null,
          format_id: 'format-mtg-pauper',
          game_id: 'game-mtg',
          starts_at: '2026-01-10T20:00:00.000Z',
        },
        { id: 'format-mtg-pauper' },
      ],
      method: 'PUT',
    })

    const response = await handleEventStandingApiRequest(context, standingRoute)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'event_standing_invalid' },
    })
  })
})
